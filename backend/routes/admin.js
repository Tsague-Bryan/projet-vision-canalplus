const express = require('express');
const pool = require('../db');
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// ── MULTER : stockage des captures de recharge ────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/recharges");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `recharge_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont acceptées"));
    }
  },
});

// ── DEMANDE DE RECHARGE (avec capture d'écran) ────────────────────────────────
// Frontend envoie un FormData avec : montant, moyen_paiement, numero_paiement, capture (fichier)
router.post("/admin/notifications",auth, upload.single("capture"), async (req, res) => { 
  try {
    const { montant, moyen_paiement, numero_paiement } = req.body;
    const capture = req.file ? req.file.filename : null;

    // Récupérer l'utilisateur depuis le token (middleware auth optionnel ici)
    // On accepte aussi les requêtes sans auth pour les partenaires non connectés
    const userId = req.user?.id ?? null;

    if (!montant || !moyen_paiement || !numero_paiement) {
      return res.status(400).json({ error: "Données manquantes (montant, moyen_paiement, numero_paiement)" });
    }

    // 1. Enregistrer la demande de recharge en base
    const [result] = await pool.query(
      `INSERT INTO demandes_recharge
         (user_id, montant, moyen_paiement, numero_paiement, capture, statut, created_at)
       VALUES (?, ?, ?, ?, ?, 'en_attente', NOW())`,
      [userId, Number(montant), moyen_paiement, numero_paiement, capture]
    );

    const demandeId = result.insertId;

    // 2. Récupérer le nom du partenaire pour la notification
    let partnerName = "Un partenaire";
    if (userId) {
      const [users] = await pool.query("SELECT name, prenom FROM users WHERE id = ?", [userId]);
      if (users.length > 0) {
        partnerName = `${users[0].prenom} ${users[0].name}`;
      }
    }

    // 3. Insérer une notification admin
    const notifMessage = `💳 ${partnerName} demande une recharge de ${Number(montant).toLocaleString()} FCFA via ${moyen_paiement} (N° ${numero_paiement})`;

    await pool.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      ["recharge", notifMessage]
    );

    // 4. Émettre un événement Socket.IO pour notifier l'admin en temps réel
    if (req.io) {
      req.io.emit("new_notification", {
        type:       "recharge",
        message:    notifMessage,
        demandeId,
        created_at: new Date(),
      });
    }

    return res.json({ success: true, message: "Demande de recharge envoyée avec succès", demandeId });

  } catch (err) {
    console.error("🔥 ERREUR POST /admin/notifications :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ── LISTE DES DEMANDES DE RECHARGE (pour le dashboard admin) ─────────────────
router.get("/admin/recharges", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dr.*, u.name, u.prenom, u.email, u.structure
       FROM demandes_recharge dr
       LEFT JOIN users u ON u.id = dr.user_id
       ORDER BY dr.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /admin/recharges :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── VALIDER UNE DEMANDE DE RECHARGE ──────────────────────────────────────────
// L'admin clique "Valider" → le portefeuille du partenaire est crédité
router.post("/admin/recharges/:id/valider", async (req, res) => {
  const demandeId = req.params.id;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM demandes_recharge WHERE id = ?",
      [demandeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    const demande = rows[0];

    if (demande.statut !== "en_attente") {
      return res.status(400).json({ error: "Demande déjà traitée" });
    }

    // Créditer le portefeuille
    await pool.query(
      "UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?",
      [demande.montant, demande.user_id]
    );

    // Mettre à jour le statut de la demande
    await pool.query(
      "UPDATE demandes_recharge SET statut = 'validee' WHERE id = ?",
      [demandeId]
    );

    // Notification
    await pool.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      ["recharge_validee", `✅ Recharge de ${Number(demande.montant).toLocaleString()} FCFA validée pour le partenaire ID ${demande.user_id}`]
    );

    if (req.io) {
      req.io.emit("new_notification", {
        type:    "recharge_validee",
        message: `✅ Votre recharge de ${Number(demande.montant).toLocaleString()} FCFA a été validée`,
        userId:  demande.user_id,
      });
    }

    return res.json({ success: true, message: "Recharge validée et portefeuille crédité" });

  } catch (err) {
    console.error("🔥 ERREUR validation recharge :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ── REJETER UNE DEMANDE DE RECHARGE ──────────────────────────────────────────
router.post("/admin/recharges/:id/rejeter", async (req, res) => {
  const demandeId = req.params.id;
  try {
    await pool.query(
      "UPDATE demandes_recharge SET statut = 'rejetee' WHERE id = ?",
      [demandeId]
    );
    return res.json({ success: true, message: "Demande rejetée" });
  } catch (err) {
    console.error("🔥 ERREUR rejet recharge :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── LISTE DE TOUS LES PARTENAIRES ─────────────────────────────────────────────
router.get('/partners', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, prenom, email, role, status, structure, pays, ville, quartier, telephone, codePromo, wallet_balance FROM users WHERE role='partner'"
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /partners :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PARTENAIRES EN ATTENTE ─────────────────────────────────────────────────────
router.get('/partners/pending', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, prenom, email, structure, pays, ville, quartier, telephone, codePromo FROM users WHERE role='partner' AND status='pending'"
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /partners/pending :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── STATISTIQUES ───────────────────────────────────────────────────────────────
router.get('/partners/stats', async (req, res) => {
  try {
    const [reabonnements]      = await pool.query("SELECT COUNT(*) AS total FROM reabonnements");
    const [reabonnementsJour]  = await pool.query("SELECT DATE(created_at) AS jour, COUNT(*) AS total FROM reabonnements GROUP BY jour");
    const [reabonnementsMois]  = await pool.query("SELECT MONTH(created_at) AS mois, COUNT(*) AS total FROM reabonnements GROUP BY mois");
    const [reabonnementsAnnee] = await pool.query("SELECT YEAR(created_at) AS annee, COUNT(*) AS total FROM reabonnements GROUP BY annee");
    const [commissions]        = await pool.query("SELECT SUM(montant)*0.06 AS total_commission FROM reabonnements");

    res.json({
      abonnements:        reabonnements[0].total,
      reabonnementsJour,
      reabonnementsMois,
      reabonnementsAnnee,
      commissions:        commissions[0].total_commission,
    });
  } catch (err) {
    console.error("Erreur GET /partners/stats :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── NOTIFICATIONS ADMIN ────────────────────────────────────────────────────────
router.get("/admin/notifications", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications ORDER BY id DESC LIMIT 20"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/notifications", async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications");
    res.json({ message: "Notifications effacées" });
  } catch (err) {
    console.error("Erreur DELETE /admin/notifications :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── MODIFIER UN PARTENAIRE ─────────────────────────────────────────────────────
router.put('/partners/:id', async (req, res) => {
  const { id } = req.params;
  const { name, prenom, email, structure, pays, ville, quartier, codePromo, telephone } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id=?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Partenaire introuvable" });

    await pool.query(
      `UPDATE users SET name=?, prenom=?, email=?, structure=?, pays=?, ville=?, quartier=?, codePromo=?, telephone=? WHERE id=?`,
      [name, prenom, email, structure, pays, ville, quartier, codePromo, telephone, id]
    );
    res.json({ message: "Partenaire modifié avec succès" });
  } catch (err) {
    console.error("Erreur PUT /partners/:id :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── SUPPRIMER UN PARTENAIRE ────────────────────────────────────────────────────
router.delete('/partners/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM reabonnements WHERE users_id = ?", [id]);
    await pool.query("DELETE FROM notifications WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Partenaire supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE /partners/:id :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── VALIDER / REJETER UN PARTENAIRE ───────────────────────────────────────────
router.put('/partners/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE users SET status='approved' WHERE id=?", [id]);
    res.json({ message: "Partenaire validé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put('/partners/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE users SET status='rejected' WHERE id=?", [id]);
    res.json({ message: "Partenaire rejeté" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── CRÉER UN PARTENAIRE ────────────────────────────────────────────────────────
router.post("/partners", async (req, res) => {
  const { name, prenom, structure, pays, ville, quartier, telephone, codePromo, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, prenom, structure, pays, ville, quartier, telephone, email, password, codePromo, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'partner', 'pending')`,
      [name, prenom, structure, pays, ville, quartier, telephone, email, hashedPassword, codePromo]
    );

    const notifMessage = `Nouvelle demande d'inscription de ${prenom} ${name} (${structure})`;
    await pool.query(
      "INSERT INTO notifications (type, message) VALUES (?, ?)",
      ['inscription', notifMessage]
    );

    req.io.emit("new_notification", { type: 'inscription', message: notifMessage, created_at: new Date() });
    res.json({ message: "Partenaire ajouté avec succès" });
  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── CRÉDITER MANUELLEMENT ─────────────────────────────────────────────────────
router.post("/partners/:id/credit", async (req, res) => {
  const partnerId = req.params.id;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: "Montant invalide" });
  }

  try {
    const [rows] = await pool.execute("SELECT wallet_balance, role FROM users WHERE id = ?", [partnerId]);
    if (rows.length === 0) return res.status(404).json({ message: "Utilisateur introuvable" });
    if (rows[0].role !== "partner") return res.status(403).json({ message: "Seuls les partenaires peuvent recevoir un crédit" });

    const newBalance = Number(rows[0].wallet_balance) + Number(amount);
    await pool.execute("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, partnerId]);

    return res.json({ message: "Portefeuille crédité avec succès", wallet_balance: newBalance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});


router.post("/decodeurs", async (req, res) => {
  const { numero, partner_id } = req.body;

  if (!numero || !partner_id) {
    return res.status(400).json({ message: "Données manquantes" });
  }

  try {
    // 🔥 vérifier si décodeur existe déjà
    const [exists] = await pool.query(
      "SELECT id FROM decodeurs WHERE numero = ?",
      [numero]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "Ce décodeur existe déjà" });
    }

    // 🔥 insertion
    await pool.query(
      "INSERT INTO decodeurs (numero, partner_id, status) VALUES (?, ?, 'free')",
      [numero, partner_id]
    );

    return res.json({ message: "Décodeur attribué avec succès" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/decodeurs/all", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.name, u.prenom
       FROM decodeurs d
       LEFT JOIN users u ON u.id = d.partner_id
       ORDER BY d.id DESC`
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.put("/decodeurs/:id", async (req, res) => {
  const { id } = req.params;
  const { partner_id } = req.body;

  try {
    // 🔥 vérifier si décodeur déjà utilisé
    const [check] = await pool.query(
      "SELECT status FROM decodeurs WHERE id = ?",
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({ message: "Décodeur introuvable" });
    }

    if (check[0].status === "used") {
      return res.status(403).json({
        message: "Impossible de réattribuer un décodeur déjà utilisé"
      });
    }

    // 🔥 update
    await pool.query(
      "UPDATE decodeurs SET partner_id = ? WHERE id = ?",
      [partner_id, id]
    );

    res.json({ message: "Décodeur réattribué avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.delete("/decodeurs/:id", async (req, res) => {
  try {
    const [check] = await pool.query(
      "SELECT status FROM decodeurs WHERE id = ?",
      [req.params.id]
    );

    if (check.length === 0) {
      return res.status(404).json({ message: "Introuvable" });
    }

    if (check[0].status === "used") {
      return res.status(403).json({
        message: "Impossible de supprimer un décodeur utilisé"
      });
    }

    await pool.query(
      "DELETE FROM decodeurs WHERE id = ?",
      [req.params.id]
    );

    res.json({ message: "Décodeur supprimé" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── ACTIVER / DÉSACTIVER LE BOUTON BALANCE (admin manuel) ────────────────────
// POST /api/admin/balance-toggle
// Body : { enabled: true | false }
router.post("/admin/balance-toggle", auth, async (req, res) => {
  try {
    // Vérifier que c'est bien l'admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "Le champ 'enabled' doit être true ou false" });
    }

    await pool.query(
      "UPDATE commission_settings SET balance_enabled = ?, enabled_by = 'admin' WHERE id = 1",
      [enabled ? 1 : 0]
    );

    return res.json({
      success: true,
      message: enabled
        ? "✅ Bouton Balance activé pour tous les partenaires."
        : "🔒 Bouton Balance désactivé.",
      balance_enabled: enabled,
    });

  } catch (err) {
    console.error("🔥 ERREUR balance-toggle :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── STATUT ACTUEL DU BOUTON BALANCE ──────────────────────────────────────────
// GET /api/admin/balance-status
router.get("/admin/balance-status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const [rows] = await pool.query(
      "SELECT balance_enabled, enabled_by, updated_at FROM commission_settings WHERE id = 1"
    );

    if (rows.length === 0) {
      return res.status(500).json({ error: "Paramètres introuvables" });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("🔥 ERREUR admin balance-status :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── LISTE DES RETRAITS DE COMMISSIONS (pour admin) ───────────────────────────
// GET /api/admin/retraits
router.get("/admin/retraits", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const [rows] = await pool.query(
      `SELECT dr.id, dr.montant, dr.statut, dr.created_at,
              u.name, u.prenom, u.structure, u.telephone
       FROM demandes_retrait dr
       JOIN users u ON u.id = dr.user_id
       ORDER BY dr.created_at DESC`
    );

    return res.json(rows);

  } catch (err) {
    console.error("🔥 ERREUR admin/retraits :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── TOTAL DES COMMISSIONS PAR PARTENAIRE (pour dashboard admin) ───────────────
// GET /api/admin/commissions-summary
router.get("/admin/commissions-summary", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.prenom, u.structure,
              u.commission_balance AS commissions_en_attente,
              u.commission_total   AS commissions_totales,
              u.wallet_balance
       FROM users u
       WHERE u.role = 'partner' AND u.status = 'approved'
       ORDER BY u.commission_total DESC`
    );

    // Total global des commissions générées
    const [totaux] = await pool.query(
      "SELECT COALESCE(SUM(commission), 0) AS total FROM reabonnements"
    );

    return res.json({
      partenaires:       rows,
      total_commissions: totaux[0].total,
    });

  } catch (err) {
    console.error("🔥 ERREUR commissions-summary :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
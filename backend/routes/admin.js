const express = require('express');
const pool    = require('../db');
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const auth    = require("../middleware/auth");

// ── MULTER ────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/recharges");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `recharge_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp|gif/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Seules les images sont acceptées"));
  },
});

// ── Helper : s'assurer que commission_settings a sa ligne ─────────────────────
const ensureSettings = async () => {
  await pool.query("INSERT IGNORE INTO commission_settings (id, balance_enabled, enabled_by) VALUES (1, 0, 'auto')");
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECHARGES
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/admin/notifications", auth, upload.single("capture"), async (req, res) => {
  try {
    const { montant, moyen_paiement, numero_paiement } = req.body;
    const capture = req.file ? req.file.filename : null;
    const userId  = req.user?.id ?? null;

    if (!montant || !moyen_paiement || !numero_paiement) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const [result] = await pool.query(
      "INSERT INTO demandes_recharge (user_id, montant, moyen_paiement, numero_paiement, capture, statut, created_at) VALUES (?, ?, ?, ?, ?, 'en_attente', NOW())",
      [userId, Number(montant), moyen_paiement, numero_paiement, capture]
    );

    let partnerName = "Un partenaire";
    if (userId) {
      const [u] = await pool.query("SELECT name, prenom FROM users WHERE id = ?", [userId]);
      if (u.length > 0) partnerName = `${u[0].prenom} ${u[0].name}`;
    }

    const msg = `💳 ${partnerName} demande une recharge de ${Number(montant).toLocaleString()} FCFA via ${moyen_paiement}`;
    await pool.query("INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())", ["recharge", msg]);
    if (req.io) req.io.emit("new_notification", { type: "recharge", message: msg, demandeId: result.insertId });

    return res.json({ success: true, message: "Demande envoyée", demandeId: result.insertId });
  } catch (err) {
    console.error("🔥 POST /admin/notifications:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

router.get("/admin/recharges", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT dr.*, u.name, u.prenom, u.email, u.structure FROM demandes_recharge dr LEFT JOIN users u ON u.id = dr.user_id ORDER BY dr.created_at DESC"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/recharges/:id/valider", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM demandes_recharge WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Demande introuvable" });
    if (rows[0].statut !== "en_attente") return res.status(400).json({ error: "Demande déjà traitée" });

    const d = rows[0];
    await pool.query("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?", [d.montant, d.user_id]);
    await pool.query("UPDATE demandes_recharge SET statut = 'validee' WHERE id = ?", [req.params.id]);

    if (req.io) req.io.emit("new_notification", { type: "recharge_validee", userId: d.user_id, message: `✅ Recharge de ${Number(d.montant).toLocaleString()} FCFA validée` });
    return res.json({ success: true, message: "Recharge validée" });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/recharges/:id/rejeter", async (req, res) => {
  try {
    await pool.query("UPDATE demandes_recharge SET statut = 'rejetee' WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RETRAITS WALLET
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/retraits-wallet", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    // Vérifier si la table existe
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_retrait'"
    );
    if (tables.length === 0) return res.json([]);

    const [rows] = await pool.query(
      `SELECT dr.id, dr.montant, dr.statut, dr.created_at,
              COALESCE(dr.type, 'commission') AS type,
              u.name, u.prenom, u.structure, u.telephone, u.email,
              COALESCE(u.wallet_balance, 0) AS wallet_balance
       FROM demandes_retrait dr
       JOIN users u ON u.id = dr.user_id
       ORDER BY dr.created_at DESC`
    );
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/retraits-wallet/:id/valider", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const [rows] = await pool.query("SELECT * FROM demandes_retrait WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Demande introuvable" });
    if (rows[0].statut !== "pending") return res.status(400).json({ error: "Déjà traitée" });

    const d = rows[0];
    await pool.query("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?", [d.montant, d.user_id, d.montant]);
    await pool.query("UPDATE demandes_retrait SET statut = 'approved' WHERE id = ?", [req.params.id]);

    if (req.io) req.io.emit("new_notification", { type: "retrait_valide", userId: d.user_id, message: `✅ Retrait de ${Number(d.montant).toLocaleString()} FCFA validé` });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/retraits-wallet/:id/rejeter", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await pool.query("UPDATE demandes_retrait SET statut = 'rejected' WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARTENAIRES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/partners', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, prenom, email, role, status, structure, pays, ville, quartier, telephone, codePromo,
              COALESCE(wallet_balance, 0) AS wallet_balance,
              COALESCE(commission_balance, 0) AS commission_balance,
              COALESCE(commission_total, 0) AS commission_total,
              COALESCE(balance_actif, 0) AS balance_actif
       FROM users WHERE role='partner' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.get('/partners/pending', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, prenom, email, structure, pays, ville, quartier, telephone, codePromo FROM users WHERE role='partner' AND status='pending'");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.get('/partners/stats', async (req, res) => {
  try {
    const [[{ total }]]          = await pool.query("SELECT COUNT(*) AS total FROM reabonnements");
    const [reabonnementsMois]    = await pool.query("SELECT MONTH(created_at) AS mois, COUNT(*) AS total FROM reabonnements GROUP BY mois");
    const [[{ total_commission }]] = await pool.query("SELECT COALESCE(SUM(commission), 0) AS total_commission FROM reabonnements");
    res.json({ abonnements: total, reabonnementsMois, commissions: total_commission });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id', async (req, res) => {
  const { name, prenom, email, structure, pays, ville, quartier, codePromo, telephone } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name=?,prenom=?,email=?,structure=?,pays=?,ville=?,quartier=?,codePromo=?,telephone=? WHERE id=?",
      [name, prenom, email, structure, pays, ville, quartier, codePromo, telephone, req.params.id]
    );
    res.json({ message: "Modifié" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete('/partners/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM reabonnements WHERE users_id = ?", [req.params.id]);
    await pool.query("DELETE FROM notifications WHERE user_id = ?",  [req.params.id]);
    await pool.query("DELETE FROM users WHERE id = ?",               [req.params.id]);
    res.json({ message: "Supprimé" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id/approve', async (req, res) => {
  try { await pool.query("UPDATE users SET status='approved' WHERE id=?", [req.params.id]); res.json({ message: "Validé" }); }
  catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id/reject', async (req, res) => {
  try { await pool.query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]); res.json({ message: "Rejeté" }); }
  catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/partners", async (req, res) => {
  const { name, prenom, structure, pays, ville, quartier, telephone, codePromo, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name,prenom,structure,pays,ville,quartier,telephone,email,password,codePromo,role,status) VALUES (?,?,?,?,?,?,?,?,?,?,'partner','pending')",
      [name, prenom, structure, pays, ville, quartier, telephone, email, hashedPassword, codePromo]
    );
    const msg = `Nouvelle inscription de ${prenom} ${name}`;
    await pool.query("INSERT INTO notifications (type, message) VALUES (?, ?)", ['inscription', msg]);
    if (req.io) req.io.emit("new_notification", { type: 'inscription', message: msg });
    res.json({ message: "Ajouté" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/partners/:id/credit", async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ message: "Montant invalide" });
  try {
    const [rows] = await pool.execute("SELECT wallet_balance, role FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Introuvable" });
    if (rows[0].role !== "partner") return res.status(403).json({ message: "Partenaires uniquement" });
    const newBalance = Number(rows[0].wallet_balance) + Number(amount);
    await pool.execute("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, req.params.id]);
    return res.json({ message: "Crédité", wallet_balance: newBalance });
  } catch (err) { return res.status(500).json({ message: "Erreur serveur" }); }
});

router.post("/partners/:id/validate-reabonnement", async (req, res) => {
  const { formulePrix = 10000 } = req.body;
  try {
    const commission = parseFloat((Number(formulePrix) * 0.06).toFixed(2));
    await pool.query(
      "UPDATE users SET commission_balance = COALESCE(commission_balance,0)+?, commission_total = COALESCE(commission_total,0)+? WHERE id=?",
      [commission, commission, req.params.id]
    );
    res.json({ success: true, commission });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/notifications", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM notifications ORDER BY id DESC LIMIT 20");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/notifications", async (req, res) => {
  try { await pool.query("DELETE FROM notifications"); res.json({ message: "Effacées" }); }
  catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DÉCODEURS
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/decodeurs", async (req, res) => {
  const { numero, partner_id } = req.body;
  if (!numero || !partner_id) return res.status(400).json({ message: "Données manquantes" });
  try {
    const [exists] = await pool.query("SELECT id FROM decodeurs WHERE numero = ?", [numero]);
    if (exists.length > 0) return res.status(409).json({ message: "Décodeur déjà existant" });
    await pool.query("INSERT INTO decodeurs (numero, partner_id, status) VALUES (?, ?, 'free')", [numero, partner_id]);
    return res.json({ message: "Attribué" });
  } catch (err) { return res.status(500).json({ message: "Erreur serveur" }); }
});

router.get("/decodeurs/all", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT d.*, u.name, u.prenom FROM decodeurs d LEFT JOIN users u ON u.id = d.partner_id ORDER BY d.id DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Erreur serveur" }); }
});

router.get("/partner/decodeurs", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM decodeurs WHERE partner_id = ? ORDER BY id DESC", [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Erreur serveur" }); }
});

router.put("/decodeurs/:id", async (req, res) => {
  try {
    const [check] = await pool.query("SELECT status FROM decodeurs WHERE id = ?", [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: "Introuvable" });
    if (check[0].status === "used") return res.status(403).json({ message: "Déjà utilisé" });
    await pool.query("UPDATE decodeurs SET partner_id = ? WHERE id = ?", [req.body.partner_id, req.params.id]);
    res.json({ message: "Réattribué" });
  } catch (err) { res.status(500).json({ message: "Erreur serveur" }); }
});

router.delete("/decodeurs/:id", async (req, res) => {
  try {
    const [check] = await pool.query("SELECT status FROM decodeurs WHERE id = ?", [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: "Introuvable" });
    if (check[0].status === "used") return res.status(403).json({ message: "Déjà utilisé" });
    await pool.query("DELETE FROM decodeurs WHERE id = ?", [req.params.id]);
    res.json({ message: "Supprimé" });
  } catch (err) { res.status(500).json({ message: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS — BALANCE TOGGLE GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/admin/balance-toggle", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "'enabled' doit être true ou false" });

    // S'assurer que la ligne existe
    await ensureSettings();
    await pool.query("UPDATE commission_settings SET balance_enabled = ?, enabled_by = 'admin' WHERE id = 1", [enabled ? 1 : 0]);

    // Notifier tous les partenaires en temps réel
    if (req.io) req.io.emit("balance_toggle_update", { balance_enabled: enabled });

    return res.json({ success: true, balance_enabled: enabled });
  } catch (err) {
    console.error("🔥 balance-toggle:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

router.get("/admin/balance-status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await ensureSettings();
    const [rows] = await pool.query("SELECT balance_enabled, enabled_by, updated_at FROM commission_settings WHERE id = 1");
    const jour = new Date().getDate();
    const autoActif = jour >= 28 || jour <= 2;
    return res.json({ ...rows[0], auto_actif: autoActif, final_actif: rows[0].balance_enabled === 1 || autoActif });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS — TOGGLE INDIVIDUEL PAR PARTENAIRE
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/admin/balance-toggle-partner/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });

    const partnerId = Number(req.params.id);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "'enabled' doit être true ou false" });

    const [rows] = await pool.query("SELECT id, name, prenom FROM users WHERE id = ? AND role = 'partner'", [partnerId]);
    if (rows.length === 0) return res.status(404).json({ error: "Partenaire introuvable" });

    await pool.query("UPDATE users SET balance_actif = ? WHERE id = ?", [enabled ? 1 : 0, partnerId]);

    // Notifier le partenaire en temps réel
    if (req.io) req.io.emit(`partner_balance_update_${partnerId}`, { balance_actif: enabled });

    return res.json({
      success: true,
      partner_id: partnerId,
      balance_actif: enabled,
      message: enabled ? `✅ Retrait activé pour ${rows[0].prenom} ${rows[0].name}` : `🔒 Retrait désactivé`,
    });
  } catch (err) {
    console.error("🔥 balance-toggle-partner:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS — RÉSUMÉ
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/commissions-summary", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });

    const [partenaires] = await pool.query(
      `SELECT u.id, u.name, u.prenom, u.structure,
              COALESCE(u.commission_balance, 0) AS commissions_en_attente,
              COALESCE(u.commission_total,   0) AS commissions_totales,
              COALESCE(u.wallet_balance,     0) AS wallet_balance,
              COALESCE(u.balance_actif,      0) AS balance_actif
       FROM users u
       WHERE u.role = 'partner' AND u.status = 'approved'
       ORDER BY COALESCE(u.commission_total, 0) DESC`
    );

    const [[{ total }]] = await pool.query("SELECT COALESCE(SUM(commission), 0) AS total FROM reabonnements");

    const [[{ en_attente }]] = await pool.query("SELECT COALESCE(SUM(commission_balance), 0) AS en_attente FROM users WHERE role='partner'");

    const [stats_formules] = await pool.query(
      "SELECT formule, COUNT(*) AS nb_operations, COALESCE(SUM(commission), 0) AS commissions FROM reabonnements GROUP BY formule"
    );

    return res.json({
      partenaires,
      total_commissions:   Number(total),
      commissions_attente: Number(en_attente),
      stats_formules,
      seuil_admin: 50000,
    });
  } catch (err) {
    console.error("🔥 commissions-summary:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION RULES (ajustement manuel)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/commission-rules", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });

    // Si la table n'existe pas encore, retourner les valeurs par défaut
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commission_rules'"
    );
    if (tables.length === 0) {
      return res.json([
        { formule_code:"ACDD",  formule_name:"Access",      commission_base:300,  commission_actuelle:300  },
        { formule_code:"EVDD",  formule_name:"Évasion",     commission_base:600,  commission_actuelle:600  },
        { formule_code:"ACPDD", formule_name:"Access+",     commission_base:900,  commission_actuelle:900  },
        { formule_code:"TCADD", formule_name:"Tout Canal+", commission_base:1200, commission_actuelle:1200 },
      ]);
    }

    const [rows] = await pool.query(
      "SELECT formule_code, formule_name, commission_base, commission_actuelle FROM commission_rules ORDER BY commission_base ASC"
    );
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/partner/commission-rules", auth, async (req, res) => {
  try {
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commission_rules'"
    );
    if (tables.length === 0) {
      return res.json([
        { formule_code:"ACDD",  formule_name:"Access",      commission_base:300,  commission_actuelle:300  },
        { formule_code:"EVDD",  formule_name:"Évasion",     commission_base:600,  commission_actuelle:600  },
        { formule_code:"ACPDD", formule_name:"Access+",     commission_base:900,  commission_actuelle:900  },
        { formule_code:"TCADD", formule_name:"Tout Canal+", commission_base:1200, commission_actuelle:1200 },
      ]);
    }
    const [rows] = await pool.query("SELECT formule_code, formule_name, commission_base, commission_actuelle FROM commission_rules ORDER BY commission_base ASC");
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/commission-rules/:code", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });

    const { commission_actuelle } = req.body;
    if (!commission_actuelle || isNaN(Number(commission_actuelle)) || Number(commission_actuelle) < 0) {
      return res.status(400).json({ error: "Valeur invalide" });
    }

    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commission_rules'"
    );

    if (tables.length > 0) {
      await pool.query(
        "UPDATE commission_rules SET commission_actuelle = ?, updated_by = 'admin' WHERE formule_code = ?",
        [Number(commission_actuelle), req.params.code]
      );
    }

    // Notifier tous les partenaires en temps réel
    if (req.io) req.io.emit("commission_rules_update", { code: req.params.code, commission_actuelle: Number(commission_actuelle) });

    return res.json({ success: true, code: req.params.code, commission_actuelle: Number(commission_actuelle) });
  } catch (err) {
    console.error("🔥 commission-rules PUT:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARTENAIRE — RECHARGES & RETRAITS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/partner/mes-recharges", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, montant, moyen_paiement, numero_paiement, statut, created_at FROM demandes_recharge WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

module.exports = router;
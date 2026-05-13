const express = require('express');
const pool    = require('../db');
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const auth    = require("../middleware/auth");
const {
  getCommissionRules,
  updateCommissionRule,
  ensureCommissionTables,
  getAdminCommissionTotal,
} = require("../utils/commissionEngine");

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }
  next();
};

// ── MULTER ────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/recharges");
const avatarDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === "avatar" ? avatarDir : uploadDir;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const prefix = file.fieldname === "avatar" ? "avatar" : "recharge";
    cb(null, `${prefix}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp|gif/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Seules les images sont acceptées"));
  },
});

const ensureWalletOperationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_operations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(40) NOT NULL,
      montant DECIMAL(14,2) NOT NULL DEFAULT 0,
      statut VARCHAR(30) NOT NULL DEFAULT 'validee',
      moyen_paiement VARCHAR(80) NULL,
      message VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// ── Upload photo de profil partenaire ─────────────────────────────────────────
router.post("/partner/upload-avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });
    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query("UPDATE users SET photo_url = ? WHERE id = ?", [photoUrl, req.user.id]);
    res.json({ success: true, photo_url: photoUrl });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

// ── Transfert commissions → portefeuille ──────────────────────────────────────
// ✅ FIX JSON.parse : on s'assure que la réponse renvoie bien du JSON propre
router.post("/partner/transfer-commission", auth, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT commission_balance, balance_actif, wallet_balance FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (user.balance_actif !== 1) return res.status(400).json({ error: "Le paiement des commissions n'est pas activé pour votre compte." });
    if (Number(user.commission_balance) <= 0) return res.status(400).json({ error: "Vous n'avez aucune commission à retirer." });

    const amount = Number(user.commission_balance);
    await pool.query(
      "UPDATE users SET wallet_balance = wallet_balance + ?, commission_balance = 0 WHERE id = ?",
      [amount, req.user.id]
    );
    await ensureWalletOperationsTable();
    await pool.query(
      "INSERT INTO wallet_operations (user_id, type, montant, statut, moyen_paiement, message, created_at) VALUES (?, 'commission_transfer', ?, 'validee', 'Balance commissions', ?, NOW())",
      [req.user.id, amount, "Transfert des commissions vers le portefeuille"]
    );
    const [[updated]] = await pool.query("SELECT wallet_balance, commission_balance FROM users WHERE id = ?", [req.user.id]);

    if (req.io) req.io.emit(`partner_dashboard_update_${req.user.id}`, { type: "commission_transferred", amount });

    // ✅ Réponse JSON complète et propre
    return res.json({
      success:            true,
      message:            `${amount.toLocaleString("fr-FR")} FCFA transférés dans votre portefeuille avec succès.`,
      wallet_balance:     Number(updated.wallet_balance),
      commission_balance: 0,
    });
  } catch (err) {
    console.error("🔥 transfer-commission:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ── Vérification colonne date_operation ───────────────────────────────────────
const ensureRechargeDateColumn = async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_recharge' AND COLUMN_NAME='date_operation'"
    );
    if (cols.length === 0) await pool.query("ALTER TABLE demandes_recharge ADD COLUMN date_operation DATE NULL");
  } catch (err) {
    console.warn("Impossible d'assurer la colonne date_operation:", err.message);
  }
};
ensureRechargeDateColumn();

// ── Notifications partenaire ──────────────────────────────────────────────────
router.get("/partner/notifications", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/partner/notifications/read", auth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Helper commission_settings ────────────────────────────────────────────────
const ensureSettings = async () => {
  await pool.query("INSERT IGNORE INTO commission_settings (id, balance_enabled, enabled_by) VALUES (1, 0, 'auto')");
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECHARGES
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/admin/notifications", auth, upload.single("capture"), async (req, res) => {
  try {
    const { montant, moyen_paiement, numero_paiement, date_operation } = req.body;
    const capture = req.file ? req.file.filename : null;
    const userId  = req.user?.id ?? null;

    if (!montant || !moyen_paiement || !numero_paiement || !date_operation) {
      return res.status(400).json({ error: "Données manquantes" });
    }
    const parsedDate = new Date(date_operation);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: "Date d'opération invalide" });

    const [result] = await pool.query(
      "INSERT INTO demandes_recharge (user_id, montant, moyen_paiement, numero_paiement, date_operation, capture, statut, created_at) VALUES (?, ?, ?, ?, ?, ?, 'en_attente', NOW())",
      [userId, Number(montant), moyen_paiement, numero_paiement, date_operation, capture]
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

// ✅ GET recharges avec rejected_count + filtre date + pagination
router.get("/admin/recharges", auth, adminOnly, async (req, res) => {
  try {
    const { date, page } = req.query;
    const limit  = 10;
    const p      = Math.max(1, parseInt(page) || 1);
    const offset = (p - 1) * limit;

    let whereClause = "";
    let queryParams = [];
    if (date) {
      whereClause = "WHERE dr.date_operation = ? OR DATE(dr.created_at) = ?";
      queryParams = [date, date];
    }

    const [[{ total }]]         = await pool.query(`SELECT COUNT(*) AS total FROM demandes_recharge dr ${whereClause}`, queryParams);
    const [[{ rejected_count }]] = await pool.query("SELECT COUNT(*) AS rejected_count FROM demandes_recharge WHERE statut = 'rejetee'");
    const [[{ rejected_sum }]]   = await pool.query("SELECT COALESCE(SUM(montant), 0) AS rejected_sum FROM demandes_recharge WHERE statut = 'rejetee'");

    const [rows] = await pool.query(`
      SELECT dr.*, u.name, u.prenom, u.email, u.structure
      FROM demandes_recharge dr
      LEFT JOIN users u ON u.id = dr.user_id
      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    return res.json({ recharges: rows, rejected_count, rejected_sum: Number(rejected_sum), total, page: p, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("🔥 GET /admin/recharges:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/admin/recharges/:id/valider", auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM demandes_recharge WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Demande introuvable" });
    if (rows[0].statut !== "en_attente") return res.status(400).json({ error: "Demande déjà traitée" });
    const d = rows[0];
    await pool.query("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?", [d.montant, d.user_id]);
    await pool.query("UPDATE demandes_recharge SET statut = 'validee' WHERE id = ?", [req.params.id]);
    await pool.query(
      "INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)",
      [d.user_id, 'recharge_validee', `✅ Votre recharge de ${Number(d.montant).toLocaleString()} FCFA a été validée.`]
    );
    if (req.io) {
      req.io.emit("new_notification", { type: "recharge_validee", userId: d.user_id, message: `✅ Recharge de ${Number(d.montant).toLocaleString()} FCFA validée` });
      req.io.emit("admin_dashboard_update", { type: "recharge_validee", user_id: d.user_id });
      req.io.emit(`partner_dashboard_update_${d.user_id}`, { type: "recharge_validee" });
      req.io.emit(`partner_notification_${d.user_id}`, { message: `✅ Votre recharge de ${Number(d.montant).toLocaleString()} FCFA a été validée.` });
    }
    return res.json({ success: true, message: "Recharge validée" });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/admin/recharges/:id/rejeter", auth, adminOnly, async (req, res) => {
  try {
    const [[d]] = await pool.query("SELECT user_id, montant FROM demandes_recharge WHERE id = ?", [req.params.id]);
    if (d) {
      await pool.query(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)",
        [d.user_id, 'recharge_rejetee', `❌ Votre demande de recharge de ${Number(d.montant).toLocaleString()} FCFA a été rejetée.`]
      );
      if (req.io) req.io.emit(`partner_notification_${d.user_id}`, { message: `❌ Votre recharge de ${Number(d.montant).toLocaleString()} FCFA a été rejetée.` });
    }
    await pool.query("UPDATE demandes_recharge SET statut = 'rejetee' WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RETRAITS WALLET
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/retraits-wallet", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const [tables] = await pool.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_retrait'");
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

router.post("/admin/retraits-wallet/:id/valider", auth, adminOnly, async (req, res) => {
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

router.post("/admin/retraits-wallet/:id/rejeter", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await pool.query("UPDATE demandes_retrait SET statut = 'rejected' WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARTENAIRES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/partners', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, prenom, email, role, status, structure, pays, ville, quartier, telephone, codePromo,
              photo_url,
              COALESCE(wallet_balance, 0) AS wallet_balance,
              COALESCE(commission_balance, 0) AS commission_balance,
              COALESCE(commission_total, 0) AS commission_total,
              COALESCE(balance_actif, 0) AS balance_actif
       FROM users WHERE role='partner' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.get('/partners/pending', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, prenom, email, structure, pays, ville, quartier, telephone, codePromo FROM users WHERE role='partner' AND status='pending'"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

// ✅ FIX stats : la carte "Commissions générées" admin = 6% de tous les réabonnements
router.get('/partners/stats', auth, adminOnly, async (req, res) => {
  try {
    const [[{ total }]]            = await pool.query("SELECT COUNT(*) AS total FROM reabonnements");
    const [[{ admin_gains }]]      = await pool.query("SELECT COALESCE(SUM(montant * 0.06), 0) AS admin_gains FROM reabonnements");
    const [reabonnementsMois]      = await pool.query("SELECT MONTH(created_at) AS mois, COUNT(*) AS total FROM reabonnements GROUP BY mois");
    const [[{ total_commission }]] = await pool.query("SELECT COALESCE(SUM(commission), 0) AS total_commission FROM reabonnements");

    res.json({
      abonnements:        total,
      reabonnementsMois,
      commissions:        total_commission,
      admin_gains:        Math.round(Number(admin_gains)),
    });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id', auth, adminOnly, async (req, res) => {
  const { name, prenom, email, structure, pays, ville, quartier, codePromo, telephone, password } = req.body;
  try {
    const fields = ["name=?", "prenom=?", "email=?", "structure=?", "pays=?", "ville=?", "quartier=?", "codePromo=?", "telephone=?"];
    const values = [name, prenom, email, structure, pays, ville, quartier, codePromo, telephone];

    if (password && String(password).trim()) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
      }
      fields.push("password=?");
      values.push(await bcrypt.hash(String(password), 10));
    }

    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(",")} WHERE id=?`, values);
    res.json({ message: "Modifié" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete('/partners/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM reabonnements WHERE users_id = ?", [req.params.id]);
    await pool.query("DELETE FROM notifications WHERE user_id = ?",  [req.params.id]);
    await pool.query("DELETE FROM users WHERE id = ?",               [req.params.id]);
    res.json({ message: "Supprimé" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    await pool.query("UPDATE users SET status='approved' WHERE id=?", [req.params.id]);
    // Notifier le partenaire
    await pool.query("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)", [req.params.id, 'compte_approuve', '✅ Votre compte partenaire a été approuvé !']);
    if (req.io) req.io.emit(`partner_notification_${req.params.id}`, { message: '✅ Votre compte partenaire a été approuvé !' });
    res.json({ message: "Validé" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.put('/partners/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    await pool.query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]);
    await pool.query("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)", [req.params.id, 'compte_rejete', '❌ Votre demande de compte partenaire a été rejetée.']);
    if (req.io) req.io.emit(`partner_notification_${req.params.id}`, { message: '❌ Votre demande de compte partenaire a été rejetée.' });
    res.json({ message: "Rejeté" });
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/partners", auth, adminOnly, async (req, res) => {
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

router.post("/partners/:id/credit", auth, adminOnly, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ message: "Montant invalide" });
  try {
    const [rows] = await pool.execute("SELECT wallet_balance, role FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Introuvable" });
    if (rows[0].role !== "partner") return res.status(403).json({ message: "Partenaires uniquement" });
    const newBalance = Number(rows[0].wallet_balance) + Number(amount);
    await pool.execute("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, req.params.id]);
    // ✅ Notifier le partenaire de la créditation
    await pool.query("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)",
      [req.params.id, 'creditation', `💳 Votre portefeuille a été crédité de ${Number(amount).toLocaleString()} FCFA.`]);
    if (req.io) {
      req.io.emit("admin_dashboard_update",                       { type: "wallet_credit", user_id: Number(req.params.id) });
      req.io.emit(`partner_dashboard_update_${req.params.id}`,   { type: "wallet_credit" });
      req.io.emit(`partner_notification_${req.params.id}`,       { message: `💳 Votre portefeuille a été crédité de ${Number(amount).toLocaleString()} FCFA.` });
    }
    return res.json({ message: "Crédité", wallet_balance: newBalance });
  } catch (err) { return res.status(500).json({ message: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/notifications", auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM notifications WHERE user_id IS NULL ORDER BY id DESC LIMIT 50");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/admin/notifications", auth, adminOnly, async (req, res) => {
  try { await pool.query("DELETE FROM notifications WHERE user_id IS NULL"); res.json({ message: "Effacées" }); }
  catch (err) { res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DÉCODEURS
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/decodeurs", auth, adminOnly, async (req, res) => {
  const { numero, partner_id } = req.body;
  if (!numero || !partner_id) return res.status(400).json({ message: "Données manquantes" });
  try {
    const [exists] = await pool.query("SELECT id FROM decodeurs WHERE numero = ?", [numero]);
    if (exists.length > 0) return res.status(409).json({ message: "Décodeur déjà existant" });
    await pool.query("INSERT INTO decodeurs (numero, partner_id, status) VALUES (?, ?, 'free')", [numero, partner_id]);
    // ✅ Notifier le partenaire qu'un décodeur lui a été attribué
    await pool.query("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)",
      [partner_id, 'nouveau_decodeur', `🖥️ Un nouveau décodeur (${numero}) a été ajouté à votre actif.`]);
    if (req.io) {
      req.io.emit(`partner_notification_${partner_id}`, { message: `🖥️ Un nouveau décodeur (${numero}) a été ajouté à votre actif.` });
      req.io.emit(`partner_dashboard_update_${partner_id}`, { type: "nouveau_decodeur" });
    }
    return res.json({ message: "Attribué" });
  } catch (err) { return res.status(500).json({ message: "Erreur serveur" }); }
});

router.get("/decodeurs/all", auth, adminOnly, async (req, res) => {
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

router.put("/decodeurs/:id", auth, adminOnly, async (req, res) => {
  try {
    const [check] = await pool.query("SELECT status FROM decodeurs WHERE id = ?", [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: "Introuvable" });
    if (check[0].status === "used") return res.status(403).json({ message: "Déjà utilisé" });
    await pool.query("UPDATE decodeurs SET partner_id = ? WHERE id = ?", [req.body.partner_id, req.params.id]);
    res.json({ message: "Réattribué" });
  } catch (err) { res.status(500).json({ message: "Erreur serveur" }); }
});

router.delete("/decodeurs/:id", auth, adminOnly, async (req, res) => {
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

router.post("/admin/balance-toggle", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "'enabled' doit être true ou false" });
    await ensureSettings();
    await pool.query("UPDATE commission_settings SET balance_enabled = ?, enabled_by = 'admin' WHERE id = 1", [enabled ? 1 : 0]);
    if (enabled) await pool.query("UPDATE users SET balance_actif = 1 WHERE role = 'partner' AND status = 'approved'");
    if (req.io) {
      req.io.emit("balance_toggle_update",   { balance_enabled: enabled });
      req.io.emit("partner_dashboard_update",{ type: "balance_toggle_global" });
      req.io.emit("admin_dashboard_update",  { type: "balance_toggle_global" });
    }
    return res.json({ success: true, balance_enabled: enabled });
  } catch (err) {
    console.error("🔥 balance-toggle:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

router.get("/admin/balance-status", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await ensureSettings();
    const [rows] = await pool.query("SELECT balance_enabled, enabled_by, updated_at FROM commission_settings WHERE id = 1");
    return res.json({ ...rows[0], auto_actif: false, final_actif: rows[0].balance_enabled === 1 });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS — TOGGLE PAR PARTENAIRE
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/admin/balance-toggle-partner/:id", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const partnerId = Number(req.params.id);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "'enabled' doit être true ou false" });
    const [rows] = await pool.query("SELECT id, name, prenom FROM users WHERE id = ? AND role = 'partner'", [partnerId]);
    if (rows.length === 0) return res.status(404).json({ error: "Partenaire introuvable" });
    await pool.query("UPDATE users SET balance_actif = ? WHERE id = ?", [enabled ? 1 : 0, partnerId]);
    if (req.io) {
      req.io.emit(`partner_balance_update_${partnerId}`,       { balance_actif: enabled });
      req.io.emit(`partner_dashboard_update_${partnerId}`,     { type: "balance_toggle" });
      req.io.emit("admin_dashboard_update",                    { type: "balance_toggle_partner", user_id: partnerId });
    }
    return res.json({
      success: true, partner_id: partnerId, balance_actif: enabled,
      message: enabled ? `✅ Retrait activé pour ${rows[0].prenom} ${rows[0].name}` : `🔒 Retrait désactivé`,
    });
  } catch (err) {
    console.error("🔥 balance-toggle-partner:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS — RÉSUMÉ
// ✅ FIX : total_commissions affiche le 6% admin (admin_gains), pas les commissions partenaires
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/commissions-summary", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await ensureCommissionTables(pool);

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

    // ✅ admin_gains = 6% du CA total de tous les réabonnements
    const [[{ admin_gains }]] = await pool.query(
      "SELECT COALESCE(SUM(montant * 0.06), 0) AS admin_gains FROM reabonnements"
    );
    const [[{ total_partner_commissions }]] = await pool.query(
      "SELECT COALESCE(SUM(commission), 0) AS total_partner_commissions FROM reabonnements"
    );
    const [[{ en_attente }]] = await pool.query(
      "SELECT COALESCE(SUM(commission_balance), 0) AS en_attente FROM users WHERE role='partner'"
    );

    const stats_formules = await getCommissionRules(pool, { chartOnly: true });

    return res.json({
      partenaires,
      total_commissions:          Math.round(Number(admin_gains)),       // ✅ 6% admin dans la carte orange
      total_partner_commissions:  Number(total_partner_commissions),     // commissions partenaires (onglet commissions)
      commissions_attente:        Number(en_attente),
      stats_formules,
      seuil_admin: 50000,
    });
  } catch (err) {
    console.error("🔥 commissions-summary:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION RULES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/commission-rules", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    return res.json(await getCommissionRules(pool));
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/admin/commission-operations", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    await ensureCommissionTables(pool);
    const { date } = req.query;
    const params = [];
    let where = "";
    if (date) { where = "WHERE h.business_day_key = ?"; params.push(date); }
    const [rows] = await pool.query(
      `SELECT h.id, h.business_day_key, h.user_id, h.numero_abonne, h.formule_code, h.formule_name,
              h.operation_type, h.amount, h.rate_applied, h.commission_amount, h.is_bonus,
              h.trend_after, h.created_at, u.name, u.prenom, u.structure
       FROM commission_operation_history h
       LEFT JOIN users u ON u.id = h.user_id
       ${where}
       ORDER BY h.created_at DESC LIMIT 200`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error("🔥 commission-operations:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

router.get("/partner/commission-rules", auth, async (req, res) => {
  try {
    const rules = await getCommissionRules(pool, { chartOnly: true });
    return res.json(rules.map(({ cashbox_amount, ...rule }) => rule));
  }
  catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/admin/commission-rules/:code", auth, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const { commission_actuelle, current_rate, price, fixed_commission, cashbox_amount } = req.body;
    const hasValue = [commission_actuelle, current_rate, price, fixed_commission, cashbox_amount].some(v => v !== undefined && v !== "");
    if (!hasValue) return res.status(400).json({ error: "Valeur invalide" });
    const updated = await updateCommissionRule(pool, req.params.code, { commission_actuelle, current_rate, price, fixed_commission, cashbox_amount });
    if (req.io) {
      req.io.emit("commission_rules_update",  updated);
      req.io.emit("partner_dashboard_update", { type: "commission_rules_update" });
      req.io.emit("admin_dashboard_update",   { type: "commission_rules_update" });
    }
    return res.json({ success: true, rule: updated });
  } catch (err) {
    console.error("🔥 commission-rules PUT:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARTENAIRE — RECHARGES & PROFIL
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/partner/mes-recharges", auth, async (req, res) => {
  try {
    await ensureWalletOperationsTable();
    const [rows] = await pool.query(
      `SELECT id, montant, moyen_paiement, numero_paiement, statut, date_operation, created_at, 'recharge' AS type
       FROM demandes_recharge WHERE user_id = ?
       UNION ALL
       SELECT id, montant, moyen_paiement, NULL AS numero_paiement, statut, DATE(created_at) AS date_operation, created_at, type
       FROM wallet_operations WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id, req.user.id]
    );
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

router.put("/partner/profile", auth, async (req, res) => {
  try {
    const { name, prenom, telephone, email } = req.body;
    await pool.query(
      "UPDATE users SET name=?, prenom=?, telephone=?, email=? WHERE id=?",
      [name, prenom, telephone, email, req.user.id]
    );
    return res.json({ success: true, message: "Profil mis à jour" });
  } catch (err) {
    console.error("🔥 partner/profile:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/partner/change-password", auth, async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;
    if (!ancien || !nouveau) return res.status(400).json({ error: "Données manquantes" });
    if (nouveau.length < 6)  return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    const [[user]] = await pool.query("SELECT password FROM users WHERE id=?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const isMatch = await bcrypt.compare(ancien, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    const hashed = await bcrypt.hash(nouveau, 10);
    await pool.query("UPDATE users SET password=? WHERE id=?", [hashed, req.user.id]);
    return res.json({ success: true, message: "Mot de passe modifié avec succès" });
  } catch (err) {
    console.error("🔥 change-password:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});
router.delete("/partner/notifications/clear", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications WHERE user_id = ?", [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/admin/config/commission-abonnement", auth, adminOnly, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
  const { valeur } = req.body;
  if (!valeur || isNaN(Number(valeur)) || Number(valeur) < 0) {
    return res.status(400).json({ error: "Valeur invalide" });
  }
  try {
    await pool.query(
      "INSERT INTO app_config (cle, valeur) VALUES ('commission_abonnement', ?) ON DUPLICATE KEY UPDATE valeur = ?",
      [String(valeur), String(valeur)]
    );
    if (req.io) req.io.emit("config_update", { key: "commission_abonnement", valeur });
    return res.json({ success: true, valeur: Number(valeur) });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/admin/config/commission-abonnement", auth, adminOnly, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      "SELECT valeur FROM app_config WHERE cle = 'commission_abonnement'"
    );
    return res.json({ valeur: row ? Number(row.valeur) : 2000 });
  } catch (err) {
    return res.json({ valeur: 2000 });
  }
});
module.exports = router;

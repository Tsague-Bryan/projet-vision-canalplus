// routes/withdraw.js
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

const fenetreAutoActive = () => {
  const jour = new Date().getDate();
  return jour >= 28 || jour <= 2;
};

const ensureSettings = async () => {
  await pool.query("INSERT IGNORE INTO commission_settings (id, balance_enabled, enabled_by) VALUES (1, 0, 'auto')");
};

// ── GET statut du bouton balance ──────────────────────────────────────────────
router.get("/balance-status", auth, async (req, res) => {
  try {
    await ensureSettings();
    const [s] = await pool.query("SELECT balance_enabled FROM commission_settings WHERE id = 1");
    const auto = fenetreAutoActive();
    const enabled = (s.length > 0 && s[0].balance_enabled === 1) || auto;
    const [[u]] = await pool.query("SELECT COALESCE(commission_balance,0) AS commission_balance FROM users WHERE id=?", [req.user.id]);
    return res.json({ bouton_actif: enabled, commission_balance: Number(u.commission_balance) });
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

// ── POST /withdraw — Balancer commissions → portefeuille ─────────────────────
router.post("/withdraw", auth, async (req, res) => {
  const userId = req.user.id;
  let connection;
  try {
    await ensureSettings();
    const [s] = await pool.query("SELECT balance_enabled FROM commission_settings WHERE id = 1");
    const auto    = fenetreAutoActive();
    const enabled = (s.length > 0 && s[0].balance_enabled === 1) || auto;

    if (!enabled) {
      return res.status(403).json({
        error: "Le retrait de vos commissions n'est pas encore possible. Veuillez patienter la période des paiements (disponible du 28 au 2 de chaque mois)."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[u]] = await connection.query(
      "SELECT name, prenom, COALESCE(commission_balance,0) AS commission_balance, COALESCE(wallet_balance,0) AS wallet_balance FROM users WHERE id=? FOR UPDATE",
      [userId]
    );
    const montant = Number(u.commission_balance);
    if (montant <= 0) { await connection.rollback(); return res.status(400).json({ error: "Aucune commission à retirer." }); }

    const newWallet = Number(u.wallet_balance) + montant;
    await connection.query("UPDATE users SET wallet_balance=?, commission_balance=0 WHERE id=?", [newWallet, userId]);

    // Vérifier si la table existe avant d'insérer
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_retrait'"
    );
    if (tables.length > 0) {
      await connection.query(
        "INSERT INTO demandes_retrait (user_id, montant, statut, created_at) VALUES (?, ?, 'approved', NOW())",
        [userId, montant]
      );
    }

    const partnerName = `${u.prenom||""} ${u.name}`.trim();
    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      ["retrait_commission", `💸 ${partnerName} a transféré ${Number(montant).toLocaleString()} FCFA de commissions vers son portefeuille.`]
    );
    await connection.commit();

    if (req.io) req.io.emit("new_notification", { type:"retrait_commission", message:`💸 Retrait commissions — ${partnerName}` });

    return res.json({
      success:            true,
      message:            `${Number(montant).toLocaleString()} FCFA de commissions transférés dans votre portefeuille.`,
      montant_retire:     montant,
      wallet_balance:     newWallet,
      commission_balance: 0,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 withdraw:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── POST /withdraw-wallet — Retrait du portefeuille (demande à l'admin) ───────
router.post("/withdraw-wallet", auth, async (req, res) => {
  const userId = req.user.id;
  const { montant, date, numero } = req.body;
  if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[u]] = await connection.query(
      "SELECT name, prenom, COALESCE(wallet_balance,0) AS wallet_balance FROM users WHERE id=? FOR UPDATE",
      [userId]
    );
    if (Number(u.wallet_balance) < Number(montant)) {
      await connection.rollback();
      return res.status(400).json({ error: `Solde insuffisant. Disponible: ${Number(u.wallet_balance).toLocaleString()} FCFA` });
    }

    // Vérifier si la table existe
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_retrait'"
    );
    if (tables.length > 0) {
      await connection.query(
        "INSERT INTO demandes_retrait (user_id, montant, statut, created_at) VALUES (?, ?, 'pending', NOW())",
        [userId, Number(montant)]
      );
    }

    const partnerName = `${u.prenom||""} ${u.name}`.trim();
    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      ["demande_retrait", `💰 ${partnerName} demande un retrait de ${Number(montant).toLocaleString()} FCFA${numero ? ` vers le ${numero}` : ""}${date ? ` pour le ${date}` : ""}.`]
    );
    await connection.commit();

    if (req.io) req.io.emit("new_notification", { type:"demande_retrait", message:`💰 Demande retrait — ${partnerName}` });

    return res.json({ success: true, message: "Demande envoyée. L'admin validera sous peu." });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── GET /retraits — Historique des retraits du partenaire ─────────────────────
router.get("/retraits", auth, async (req, res) => {
  try {
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='demandes_retrait'"
    );
    if (tables.length === 0) return res.json([]);
    const [rows] = await pool.query(
      "SELECT id, montant, statut, created_at FROM demandes_retrait WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) { return res.status(500).json({ error: "Erreur serveur" }); }
});

module.exports = router;
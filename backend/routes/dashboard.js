// routes/dashboard.js
const express = require("express");
const fs      = require("fs");
const path    = require("path");
const auth    = require("../middleware/auth");
const pool    = require("../db");
const router  = express.Router();

const fenetreAutoActive = () => {
  const jour = new Date().getDate();
  return jour >= 28 || jour <= 2;
};

// ── GET /api/partner/dashboard ────────────────────────────────────────────────
router.get("/partner/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Vérifier que c'est bien un partenaire
    if (req.user.role !== "partner") {
      return res.status(403).json({ error: "Accès réservé aux partenaires" });
    }

    const [[u]] = await pool.query(
      `SELECT name, prenom,
              COALESCE(wallet_balance, 0)      AS wallet_balance,
              COALESCE(commission_balance, 0)  AS commission_balance,
              COALESCE(commission_total, 0)    AS commission_total
       FROM users WHERE id = ? AND role = 'partner'`,
      [userId]
    );
    if (!u) return res.status(404).json({ message: "Partenaire introuvable" });

    const [[{ total: nbReab }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );
    const [[{ total: nbClients }]] = await pool.query(
      "SELECT COUNT(DISTINCT numero_abonne) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );
    const [[{ total: revenus }]] = await pool.query(
      "SELECT COALESCE(SUM(montant), 0) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );

    const [statsRows] = await pool.query(
      `SELECT formule, COALESCE(SUM(commission), 0) AS commissions, COUNT(*) AS nb_operations
       FROM reabonnements WHERE users_id = ? GROUP BY formule`, [userId]
    );

    const [transactionsRows] = await pool.query(
      `SELECT id, numero_abonne, formule, montant, duree,
              COALESCE(commission, 0) AS commission,
              COALESCE(type_operation, 'reabonnement') AS type_operation,
              created_at
       FROM reabonnements WHERE users_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    const transactions = transactionsRows.map(t => {
      const fp = path.join(__dirname, "../invoices", `facture_${t.id}.html`);
      return { ...t, facture_url: fs.existsSync(fp) ? `/invoices/facture_${t.id}.html` : null };
    });

    // Statut bouton Balance
    let boutonBalanceActif = fenetreAutoActive();
    try {
      const [s] = await pool.query("SELECT balance_enabled FROM commission_settings WHERE id = 1");
      if (s.length > 0 && s[0].balance_enabled === 1) boutonBalanceActif = true;
    } catch (_) {}

    return res.json({
      message:              `Bienvenue ${u.prenom||""} ${u.name}`.trim(),
      wallet_balance:       Number(u.wallet_balance),
      commission_balance:   Number(u.commission_balance),
      commission_total:     Number(u.commission_total),
      bouton_balance_actif: boutonBalanceActif,
      stats:                { clients: nbClients, reabonnements: nbReab, revenus: Number(revenus) },
      commissions_par_formule: statsRows,
      transactions,
    });

  } catch (err) {
    console.error("🔥 dashboard partenaire:", err);
    return res.status(500).json({ message: "Erreur serveur", details: err.message });
  }
});

module.exports = router;
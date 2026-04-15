const express = require("express");
const fs      = require("fs");
const path    = require("path");
const auth    = require("../middleware/auth");
const pool    = require("../db");
const router  = express.Router();

// ── DASHBOARD PARTENAIRE ──────────────────────────────────────────────────────
router.get("/partner/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Infos du partenaire (portefeuille + commissions)
    const [userRows] = await pool.query(
      "SELECT name, prenom, wallet_balance, commission_balance, commission_total FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const user = userRows[0];

    // Nombre total de réabonnements
    const [reabRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM reabonnements WHERE users_id = ?",
      [userId]
    );

    // Clients uniques
    const [clientsRows] = await pool.query(
      "SELECT COUNT(DISTINCT numero_abonne) AS total FROM reabonnements WHERE users_id = ?",
      [userId]
    );

    // Commissions par formule (pour graphique)
    const [statsRows] = await pool.query(
      `SELECT formule,
              COALESCE(SUM(commission), 0) AS commissions,
              COUNT(*) AS nb_operations
       FROM reabonnements
       WHERE users_id = ?
       GROUP BY formule`,
      [userId]
    );

    // 20 dernières transactions avec URL facture
    const [transactionsRows] = await pool.query(
      `SELECT id, numero_abonne, formule, montant, duree, commission,
              COALESCE(type_operation, 'reabonnement') AS type_operation,
              created_at
       FROM reabonnements
       WHERE users_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Enrichir avec l'URL de facture si elle existe
    const transactionsAvecFactures = transactionsRows.map((t) => {
      const factureFilename = `facture_${t.id}.html`;
      const facturePath     = path.join(__dirname, "../invoices", factureFilename);
      return {
        ...t,
        facture_url: fs.existsSync(facturePath) ? `/invoices/${factureFilename}` : null,
      };
    });

    // Statut du bouton Balance
    const [settings] = await pool.query(
      "SELECT balance_enabled FROM commission_settings WHERE id = 1"
    );

    const fenetreAuto = (() => {
      const now  = new Date();
      const jour = now.getDate();
      const dernierJour = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return (jour >= 28 && jour <= dernierJour) || jour <= 2;
    })();

    const boutonBalanceActif =
      (settings.length > 0 && settings[0].balance_enabled === 1) || fenetreAuto;

    return res.json({
      message:            `Bienvenue ${user.prenom || ""} ${user.name}`.trim(),
      wallet_balance:     Number(user.wallet_balance),
      commission_balance: Number(user.commission_balance),  // commissions non retirées
      commission_total:   Number(user.commission_total),    // total historique
      bouton_balance_actif: boutonBalanceActif,

      stats: {
        clients:       clientsRows[0].total,
        reabonnements: reabRows[0].total,
      },

      commissions_par_formule: statsRows,
      transactions:            transactionsAvecFactures,
    });

  } catch (err) {
    console.error("🔥 Erreur dashboard partenaire :", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
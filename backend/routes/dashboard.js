const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/auth");
const pool = require("../db");
const router = express.Router();

const invoiceIndexPath = path.join(__dirname, "../data/invoiceIndex.json");
const readInvoiceIndex = () => {
  try {
    if (!fs.existsSync(invoiceIndexPath)) return {};
    return JSON.parse(fs.readFileSync(invoiceIndexPath, "utf8"));
  } catch {
    return {};
  }
};

router.get("/partner/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Infos de base du partenaire
    const [userRows] = await pool.query(
      "SELECT name, wallet_balance FROM users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    const user = userRows[0];

    // Nombre total de réabonnements effectués
    const [reabRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM reabonnements WHERE users_id = ?",
      [userId]
    );

    // Revenus totaux (somme des montants)
    const [revenusRows] = await pool.query(
      "SELECT COALESCE(SUM(montant), 0) AS total FROM reabonnements WHERE users_id = ?",
      [userId]
    );

    // Nombre de clients uniques (numéros abonnés distincts)
    const [clientsRows] = await pool.query(
      "SELECT COUNT(DISTINCT numero_abonne) AS total FROM reabonnements WHERE users_id = ?",
      [userId]
    );

    // Commissions par formule pour le graphique
    const [statsRows] = await pool.query(
      `SELECT formule, 
              COALESCE(SUM(montant * 0.06), 0) AS commissions
       FROM reabonnements 
       WHERE users_id = ?
       GROUP BY formule`,
      [userId]
    );

    // Historique des 20 dernières transactions
    const [transactionsRows] = await pool.query(
      `SELECT id, numero_abonne, formule, montant, duree, created_at
       FROM reabonnements
       WHERE users_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const invoiceIndex = readInvoiceIndex();
    const transactionsWithInvoices = transactionsRows.map((transaction) => ({
      ...transaction,
      invoice_url: invoiceIndex[transaction.id]?.url || null,
    }));

    res.json({
      message: `Bienvenue ${user.name}`,
      wallet_balance: user.wallet_balance,
      transactions: transactionsWithInvoices,
      
      stats: {
        clients:       clientsRows[0].total,
        reabonnements: reabRows[0].total,
        revenus:       revenusRows[0].total,
      },
      commissions_par_formule: statsRows,
      transactions: transactionsRows,
    });

  } catch (err) {
    console.error("Erreur dashboard partenaire :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;

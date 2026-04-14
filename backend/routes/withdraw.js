const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");


router.post("/withdraw", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { montant } = req.body;

    // 1. récupérer commissions
    const [rows] = await pool.query(
      "SELECT COALESCE(SUM(commission), 0) AS total FROM transactions WHERE user_id = ?",
      [userId]
    );

    const totalCommission = rows[0].total;

    if (montant > totalCommission) {
      return res.status(400).json({ message: "Solde commissions insuffisant" });
    }

    // 2. retirer des commissions
    await pool.query(
      "UPDATE commissions SET amount = amount - ? WHERE user_id = ?",
      [montant, userId]
    );

    // 3. créditer le wallet
    await pool.query(
      "UPDATE wallets SET balance = balance + ? WHERE user_id = ?",
      [montant, userId]
    );

    return res.json({ message: "Transfert réussi vers le portefeuille" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
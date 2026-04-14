const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");

router.post("/abonnements", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nom, telephone, decodeur, adresse, ville, quartier } = req.body;

    // 🔥 Vérifier décodeur réel + libre
    const [check] = await db.query(
      `SELECT * FROM decodeurs 
       WHERE numero = ? 
       AND partner_id = ? 
       AND status = 'free'`,
      [decodeur, userId]
    );

    if (check.length === 0) {
      return res.status(403).json({
        message: "Décodeur invalide ou déjà utilisé",
      });
    }

    // 🔥 Insérer abonnement
    await db.query(
      `INSERT INTO abonnements (nom, telephone, decodeur, adresse, ville, quartier, partner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nom, telephone, decodeur, adresse, ville, quartier, userId]
    );

    // 🔥 MARQUER COMME UTILISÉ
    await db.query(
      `UPDATE decodeurs SET status = 'used'
       WHERE numero = ? AND partner_id = ?`,
      [decodeur, userId]
    );

    res.json({ message: "Abonnement effectué avec succès 🎉" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/decodeurs", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT * FROM decodeurs 
       WHERE partner_id = ? 
       AND status = 'free'`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
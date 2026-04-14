const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// ---- INSCRIPTION ----
router.post("/register", async (req, res) => {
  const { name, prenom, structure, pays, ville, quartier, telephone, password, email, codePromo } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users 
      (name, prenom, structure, pays, ville, quartier, telephone, email, password, role, status, codePromo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'partner', 'pending', ?)`,
      [name, prenom, structure, pays, ville, quartier, telephone, email, hashedPassword, codePromo || null]
    );

    // ✅ Insérer la notification en BDD
    const notifMessage = `Nouvelle demande d'inscription de ${prenom} ${name} (${structure})`;
    await pool.query(
      "INSERT INTO notifications (type, message) VALUES (?, ?)",
      ['inscription', notifMessage]
    );

    // ✅ Émettre via socket pour mise à jour instantanée chez l'admin
    req.io.emit("new_notification", {
      type: 'inscription',
      message: notifMessage,
      created_at: new Date()
    });

    res.json({
      message: "Inscription réussie, en attente de validation par l'administrateur."
    });
  } catch (err) {
    console.error("Erreur SQL :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ---- LOGIN ----
router.post("/login", async (req, res) => {
  const { name, contact, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE (email = ? OR telephone = ?) AND name = ? LIMIT 1",
      [contact, contact, name]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Utilisateur introuvable" });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    }
    if (user.status !== "approved") {
      return res.status(403).json({ success: false, message: "Compte en attente de validation par l'admin" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      success: true,
      message: "Connexion réussie",
      token,
      role: user.role
    });
  } catch (err) {
    console.error("Erreur login :", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ---- MOT DE PASSE OUBLIÉ ----
router.post("/auth/forgot-password", async (req, res) => {
  const { contact } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR telephone = ? LIMIT 1",
      [contact, contact]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: "Utilisateur introuvable" });
    }
    const user = rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000);
    await pool.query(
      "UPDATE users SET resetCode = ?, resetCodeExpires = ? WHERE id = ?",
      [resetCode, Date.now() + 10 * 60 * 1000, user.id]
    );
    sendSms(contact, `Votre code de réinitialisation est : ${resetCode}`);
    res.json({ success: true, message: "Code envoyé par SMS" });
  } catch (err) {
    console.error("Erreur forgot-password :", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

module.exports = router;


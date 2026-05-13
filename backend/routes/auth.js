// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const router  = express.Router();
const { sendResetCode } = require("../utils/mailer");

// ── INSCRIPTION ───────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, prenom, structure, pays, ville, quartier, telephone, password, email, codePromo } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, prenom, structure, pays, ville, quartier, telephone, email, password, role, status, codePromo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'partner', 'pending', ?)`,
      [name, prenom, structure, pays, ville, quartier, telephone, email, hashedPassword, codePromo || null]
    );
    const msg = `Nouvelle inscription de ${prenom} ${name} (${structure})`;
    await pool.query("INSERT INTO notifications (type, message) VALUES (?, ?)", ['inscription', msg]);
    if (req.io) req.io.emit("new_notification", { type: 'inscription', message: msg, created_at: new Date() });
    res.json({ message: "Inscription réussie, en attente de validation." });
  } catch (err) {
    console.error("Erreur register:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { contact, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR telephone = ? LIMIT 1",
      [contact, contact]
    );
    if (rows.length === 0) return res.status(401).json({ success: false, message: "Utilisateur introuvable" });

    const user    = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    if (user.status !== "approved") return res.status(403).json({ success: false, message: "Compte en attente de validation" });

    // ✅ Token valable 8h pour éviter les déconnexions intempestives
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ success: true, message: "Connexion réussie", token, role: user.role });
  } catch (err) {
    console.error("Erreur login:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

router.post("/forgot-password", async (req, res, next) => {
  if (req.body?.identifier) return next();
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ success: false, message: "Email ou téléphone requis" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, prenom, telephone, email, status FROM users WHERE email = ? OR telephone = ? LIMIT 1",
      [contact, contact]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Aucun compte trouvé avec cette information" });
    }

    const user = rows[0];
    const msg = `Demande de récupération de compte pour ${user.prenom || ""} ${user.name || ""} (${user.telephone || user.email || contact})`;
    await pool.query("INSERT INTO notifications (type, message, user_id, created_at) VALUES (?, ?, ?, NOW())", [
      "forgot_password",
      msg,
      user.id,
    ]);

    if (req.io) {
      req.io.emit("new_notification", { type: "forgot_password", message: msg, userId: user.id });
    }

    return res.json({
      success: true,
      message: "Votre demande a été transmise à l'admin. Vous serez contacté pour récupérer votre compte.",
    });
  } catch (err) {
    console.error("Erreur forgot-password:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});
const crypto = require("crypto");

// ── ÉTAPE 1 : Demander un code de réinitialisation ─────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { identifier } = req.body; // email ou telephone
  if (!identifier) return res.status(400).json({ error: "Email ou téléphone requis" });

  try {
    // Chercher l'utilisateur par email OU telephone
    const [[user]] = await pool.query(
      "SELECT id, name, prenom, email, telephone FROM users WHERE email = ? OR telephone = ? LIMIT 1",
      [identifier, identifier]
    );

    if (!user) {
      // On ne révèle pas si l'utilisateur existe (sécurité)
      return res.json({ success: true, message: "Si ce compte existe, un code a été envoyé." });
    }

    // Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalider les anciens codes non utilisés
    await pool.query(
      "UPDATE reset_codes SET used = 1 WHERE user_id = ? AND used = 0",
      [user.id]
    );

    // Enregistrer le nouveau code
    await pool.query(
      "INSERT INTO reset_codes (user_id, code, expires_at) VALUES (?, ?, ?)",
      [user.id, code, expiresAt]
    );

    // ✅ Ici on simule l'envoi (affiche dans le terminal)
    // En production, remplace par un vrai SMS (Twilio) ou email (nodemailer)
   if (user.email) {
  try {
    await sendResetCode({
      to:     user.email,
      prenom: user.prenom || user.name,
      code,
    });
    console.log(`✅ Email de reset envoyé à ${user.email}`);
  } catch (emailErr) {
    console.error("❌ Erreur envoi email:", emailErr.message);
    // On ne bloque pas — on continue quand même
  }
}

    // Si tu as nodemailer configuré, envoie l'email ici
    // await sendResetEmail(user.email, code);

    return res.json({
      success: true,
      message: "Code envoyé avec succès.",
      // En DEV seulement, retire en production :
      dev_code: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (err) {
    console.error("🔥 forgot-password:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── ÉTAPE 2 : Vérifier le code ─────────────────────────────────────────────
router.post("/verify-reset-code", async (req, res) => {
  const { identifier, code } = req.body;
  if (!identifier || !code) return res.status(400).json({ error: "Données manquantes" });

  try {
    const [[user]] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR telephone = ? LIMIT 1",
      [identifier, identifier]
    );
    if (!user) return res.status(404).json({ error: "Compte introuvable" });

    const [[resetEntry]] = await pool.query(
      `SELECT * FROM reset_codes 
       WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, code]
    );

    if (!resetEntry) {
      return res.status(400).json({ error: "Code invalide ou expiré" });
    }

    // Générer un token temporaire pour l'étape suivante
    const resetToken = crypto.randomBytes(32).toString("hex");
    await pool.query(
      "UPDATE reset_codes SET used = 1 WHERE id = ?",
      [resetEntry.id]
    );

    // Stocker le token (valable 10 minutes)
    await pool.query(
      "INSERT INTO reset_codes (user_id, code, expires_at) VALUES (?, ?, ?)",
      [user.id, `TOKEN:${resetToken}`, new Date(Date.now() + 10 * 60 * 1000)]
    );

    return res.json({ success: true, reset_token: resetToken });
  } catch (err) {
    console.error("🔥 verify-reset-code:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── ÉTAPE 3 : Réinitialiser le mot de passe ────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { reset_token, nouveau_password } = req.body;
  if (!reset_token || !nouveau_password) return res.status(400).json({ error: "Données manquantes" });
  if (nouveau_password.length < 6) return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });

  try {
    const [[entry]] = await pool.query(
      `SELECT user_id FROM reset_codes 
       WHERE code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [`TOKEN:${reset_token}`]
    );

    if (!entry) return res.status(400).json({ error: "Token invalide ou expiré" });

    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(nouveau_password, 10);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, entry.user_id]);
    await pool.query("UPDATE reset_codes SET used = 1 WHERE code = ? AND user_id = ?", [`TOKEN:${reset_token}`, entry.user_id]);

    return res.json({ success: true, message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    console.error("🔥 reset-password:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

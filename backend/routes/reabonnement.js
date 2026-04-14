const express = require("express");
const router = express.Router();
const pool = require("../db");
const axios = require("axios");
const auth = require("../middleware/auth");

// Mapping des codes d'options frontend vers codes Fujisat
const optionCodeMap = {
  "Access":      "ACDD",
  "Evasion":     "EVDD",
  "Access+":     "ACPDD",
  "Evasion+":    "EVPDD",
  "Tout Canal+": "TCADD",
};

const mapOptionCodes = (frontendCodes) => {
  if (!Array.isArray(frontendCodes) || frontendCodes.length === 0) return [];
  return frontendCodes.map(code => optionCodeMap[code] || code).filter(Boolean);
};

// ── RÉABONNEMENT ──────────────────────────────────────────────────────────────

router.post("/", auth, async (req, res) => {
  const {
    numero_abonne,
    formule,
    duree,
    montant,
    telephoneAbonne,
    materialNumber,
    numeroContrat,
    options = [],
  } = req.body;

  const userId = req.user.id;

  const missing = [];
  if (!numero_abonne)   missing.push("numero_abonne");
  if (!formule)         missing.push("formule");
  if (!duree)           missing.push("duree");
  if (!montant)         missing.push("montant");
  if (!telephoneAbonne) missing.push("telephoneAbonne");
  if (!materialNumber)  missing.push("materialNumber");
  if (!numeroContrat)   missing.push("numeroContrat");

  if (missing.length > 0) {
    return res.status(400).json({ error: "Données manquantes", missing });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT wallet_balance, name FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const user = users[0];

    if (Number(user.wallet_balance) < Number(montant)) {
      await connection.rollback();
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const fujisatPayload = {
      offreCode:     formule,
      numabo:        numero_abonne,
      materialNumber,
      duree,
      telephoneAbonne,
      numeroContrat: Number(numeroContrat) || 1,
      optionCodes:   mapOptionCodes(options),
    };

    console.log("📤 Envoi Fujisat :", fujisatPayload);

    let apiResponse;
    try {
      apiResponse = await axios.post(
        `${process.env.FUJISAT_URL}/public-api/operation/re-subscription/renew`,
        fujisatPayload,
        {
          auth: { username: process.env.FUJISAT_USER, password: process.env.FUJISAT_PASS },
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        }
      );
    } catch (err) {
      console.error("❌ Fujisat ERROR :", err.response?.data || err.message);
      await connection.rollback();
      return res.status(502).json({
        error: "Échec du réabonnement Canal+",
        details: err.response?.data || err.message,
      });
    }

    if (!apiResponse.data || apiResponse.data.success !== true) {
      await connection.rollback();
      return res.status(400).json({
        error: "Réabonnement refusé par Canal+",
        details: apiResponse.data,
      });
    }

    const newBalance = Number(user.wallet_balance) - Number(montant);

    await connection.query(
      "UPDATE users SET wallet_balance = ? WHERE id = ?",
      [newBalance, userId]
    );

    await connection.query(
      `INSERT INTO reabonnements
        (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, numero_abonne, formule, montant, duree, telephoneAbonne]
    );

    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      [
        "reabonnement",
        `💰 ${user.name} a réabonné ${numero_abonne} (${formule}${options.length > 0 ? ` + options: ${options.join(", ")}` : ""}) - ${montant} FCFA`,
      ]
    );

    await connection.commit();

    const message = encodeURIComponent(
      `Réabonnement Canal+ réussi pour ${numero_abonne} (${formule})`
    );

    return res.json({
      success:        true,
      message:        "Réabonnement effectué avec succès",
      wallet_balance: newBalance,
      whatsappLink:   `https://wa.me/237656253864?text=${message}`,
      apiData:        apiResponse.data,
      options,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 ERREUR GLOBALE :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });

  } finally {
    if (connection) connection.release();
  }
});

// ── UPGRADE DE FORMULE ────────────────────────────────────────────────────────

router.post("/upgrade", auth, async (req, res) => {
  const {
    numero_abonne,
    formule,
    materialNumber,
    numeroContrat,
    telephoneAbonne = "",
    options = [],
    // ✅ montant = delta envoyé par le frontend (prix nouvelle formule - prix actuelle + options)
    montant,
  } = req.body;

  const userId = req.user.id;

  const missing = [];
  if (!numero_abonne)  missing.push("numero_abonne");
  if (!formule)        missing.push("formule");
  if (!materialNumber) missing.push("materialNumber");
  if (!numeroContrat)  missing.push("numeroContrat");
  // ✅ Le montant est maintenant obligatoire (comme pour le réabonnement)
  if (!montant || Number(montant) <= 0) missing.push("montant");

  if (missing.length > 0) {
    return res.status(400).json({ error: "Données manquantes", missing });
  }

  // ✅ On utilise directement le montant calculé côté frontend (le delta)
  const montantFacture = Number(montant);

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT wallet_balance, name FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const user = users[0];
    const mappedOptions = mapOptionCodes(options);

    // ── Étape 1 : Vérifier le solde du partenaire ─────────────────────────────
    if (Number(user.wallet_balance) < montantFacture) {
      await connection.rollback();
      return res.status(400).json({
        error: `Solde insuffisant. Montant requis : ${montantFacture} FCFA`,
      });
    }

    // ── Étape 2 : Exécuter l'upgrade via Fujisat ──────────────────────────────
    const fujisatPayload = {
      offreCode:      formule,
      numabo:         numero_abonne,
      materialNumber,
      numeroContrat:  Number(numeroContrat) || 1,
      optionCodes:    mappedOptions,
      montantMensuel: montantFacture,
    };

    console.log("📤 Envoi Fujisat Upgrade :", fujisatPayload);

    let apiResponse;
    try {
      apiResponse = await axios.post(
        `${process.env.FUJISAT_URL}/public-api/operation/upgrade/execute`,
        fujisatPayload,
        {
          auth: { username: process.env.FUJISAT_USER, password: process.env.FUJISAT_PASS },
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        }
      );
    } catch (err) {
      console.error("❌ Fujisat Upgrade ERROR :", err.response?.data || err.message);
      await connection.rollback();
      return res.status(err.response?.status || 502).json({
        error:   "Échec de l'upgrade Canal+",
        message: err.response?.data?.detail ?? err.response?.data?.title ?? err.message,
        details: err.response?.data,
      });
    }

    if (!apiResponse.data || apiResponse.data.success !== true) {
      await connection.rollback();
      return res.status(400).json({
        error:   "Upgrade refusé par Canal+",
        message: apiResponse.data?.detail ?? apiResponse.data?.title ?? "Raison inconnue",
        details: apiResponse.data,
      });
    }

    // ── Étape 3 : Déduire le montant du portefeuille (comme pour le réabonnement) ──
    const newBalance = Number(user.wallet_balance) - montantFacture;

    await connection.query(
      "UPDATE users SET wallet_balance = ? WHERE id = ?",
      [newBalance, userId]
    );

    // ── Étape 4 : Enregistrer l'upgrade en base ───────────────────────────────
    await connection.query(
      `INSERT INTO reabonnements
        (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, type_operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'upgrade', NOW())`,
      [
        userId,
        numero_abonne,
        formule,        // nouvelle formule
        montantFacture, // ✅ delta réellement débité
        1,              // durée = 1 pour un upgrade
        telephoneAbonne,
      ]
    );

    // ── Étape 5 : Notification admin ──────────────────────────────────────────
    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      [
        "upgrade",
        `🔄 ${user.name} a upgradé ${numero_abonne} → ${formule}` +
        ` | Montant débité : ${montantFacture} FCFA` +
        (options.length > 0 ? ` | Options : ${options.join(", ")}` : ""),
      ]
    );

    await connection.commit();

    const whatsappMsg = encodeURIComponent(
      `Upgrade Canal+ réussi pour ${numero_abonne} → ${formule} | Montant : ${montantFacture} FCFA`
    );

    return res.json({
      success:         true,
      message:         "Upgrade effectué avec succès",
      wallet_balance:  newBalance,
      montantFacture,
      nouvelleFormule: formule,
      whatsappLink:    `https://wa.me/237656253864?text=${whatsappMsg}`,
      apiData:         apiResponse.data,
      options,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 ERREUR UPGRADE :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });

  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;


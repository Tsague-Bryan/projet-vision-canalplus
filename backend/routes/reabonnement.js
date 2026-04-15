const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const axios   = require("axios");
const auth    = require("../middleware/auth");
const fs      = require("fs");
const path    = require("path");

// ── Mapping codes formules frontend → Fujisat ─────────────────────────────────
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

// ── Calcul de la commission (6% du montant) ───────────────────────────────────
const calculerCommission = (montant) => {
  return parseFloat((Number(montant) * 0.06).toFixed(2));
};

// ── Génération de la facture HTML → fichier ───────────────────────────────────
const genererFacture = (data) => {
  const {
    factureId, partnerName, numero_abonne, formule,
    duree, montant, commission, type_operation, date, options
  } = data;

  const optionsHTML = options && options.length > 0
    ? `<tr><td>Options</td><td>${options.join(", ")}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${factureId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #c8102e; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #c8102e; }
    .logo span { color: #333; }
    h2 { color: #c8102e; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #c8102e; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .total { font-size: 18px; font-weight: bold; color: #c8102e; text-align: right; margin-top: 20px; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
    .badge { display: inline-block; background: #27ae60; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Vision <span>Canal+</span></div>
    <div>
      <div style="font-size:13px;color:#666;">Facture N° <strong>${factureId}</strong></div>
      <div style="font-size:13px;color:#666;">Date : ${new Date(date).toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <h2>${type_operation === "upgrade" ? "Upgrade de formule" : "Réabonnement Canal+"}</h2>
  <p>Partenaire : <strong>${partnerName}</strong> &nbsp; <span class="badge">Validé ✓</span></p>

  <table>
    <tr><th>Détail</th><th>Valeur</th></tr>
    <tr><td>Numéro abonné</td><td>${numero_abonne}</td></tr>
    <tr><td>Formule</td><td>${formule}</td></tr>
    ${optionsHTML}
    <tr><td>Durée</td><td>${duree} mois</td></tr>
    <tr><td>Montant débité</td><td>${Number(montant).toLocaleString("fr-FR")} FCFA</td></tr>
    <tr><td>Commission gagnée (6%)</td><td style="color:#27ae60;font-weight:bold;">${Number(commission).toLocaleString("fr-FR")} FCFA</td></tr>
  </table>

  <p class="total">Total : ${Number(montant).toLocaleString("fr-FR")} FCFA</p>

  <div class="footer">
    Vision Canal+ — Grossiste agréé Canal+ Cameroun<br/>
    Ce document est une facture officielle de votre opération.
  </div>
</body>
</html>`;

  const invoicesDir = path.join(__dirname, "../invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const filename = `facture_${factureId}.html`;
  const filepath = path.join(invoicesDir, filename);
  fs.writeFileSync(filepath, html, "utf8");

  return `/invoices/${filename}`;
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
      "SELECT wallet_balance, name, prenom FROM users WHERE id = ? FOR UPDATE",
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

    // Appel Fujisat
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

    // ── Calcul commission 6% ──────────────────────────────────────────────────
    const commission = calculerCommission(montant);
    const newBalance = Number(user.wallet_balance) - Number(montant);

    // Débit portefeuille
    await connection.query(
      "UPDATE users SET wallet_balance = ?, commission_balance = commission_balance + ?, commission_total = commission_total + ? WHERE id = ?",
      [newBalance, commission, commission, userId]
    );

    // Enregistrement réabonnement
    const [insertResult] = await connection.query(
      `INSERT INTO reabonnements
        (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, commission, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, numero_abonne, formule, montant, duree, telephoneAbonne, commission]
    );

    const reabonnementId = insertResult.insertId;

    // Notification admin
    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      [
        "reabonnement",
        `💰 ${user.prenom} ${user.name} a réabonné ${numero_abonne} (${formule}${options.length > 0 ? ` + ${options.join(", ")}` : ""}) — ${Number(montant).toLocaleString()} FCFA | Commission: ${commission} FCFA`,
      ]
    );

    await connection.commit();

    // Génération facture
    const partnerName = `${user.prenom || ""} ${user.name}`.trim();
    const factureUrl = genererFacture({
      factureId:      reabonnementId,
      partnerName,
      numero_abonne,
      formule,
      duree,
      montant,
      commission,
      type_operation: "reabonnement",
      date:           new Date(),
      options,
    });

    // Notification Socket.io
    if (req.io) {
      req.io.emit("new_notification", {
        type:    "reabonnement",
        message: `💰 Réabonnement ${formule} — ${numero_abonne}`,
      });
    }

    const whatsappMsg = encodeURIComponent(
      `Réabonnement Canal+ réussi pour ${numero_abonne} (${formule})`
    );

    return res.json({
      success:        true,
      message:        "Réabonnement effectué avec succès",
      wallet_balance: newBalance,
      commission,
      facture_url:    factureUrl,
      whatsappLink:   `https://wa.me/237656253864?text=${whatsappMsg}`,
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
    montant,
  } = req.body;

  const userId = req.user.id;

  const missing = [];
  if (!numero_abonne)              missing.push("numero_abonne");
  if (!formule)                    missing.push("formule");
  if (!materialNumber)             missing.push("materialNumber");
  if (!numeroContrat)              missing.push("numeroContrat");
  if (!montant || Number(montant) <= 0) missing.push("montant");

  if (missing.length > 0) {
    return res.status(400).json({ error: "Données manquantes", missing });
  }

  const montantFacture = Number(montant);

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT wallet_balance, name, prenom FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const user = users[0];
    const mappedOptions = mapOptionCodes(options);

    if (Number(user.wallet_balance) < montantFacture) {
      await connection.rollback();
      return res.status(400).json({
        error: `Solde insuffisant. Montant requis : ${montantFacture} FCFA`,
      });
    }

    // Appel Fujisat upgrade
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

    // ── Calcul commission 6% ──────────────────────────────────────────────────
    const commission = calculerCommission(montantFacture);
    const newBalance = Number(user.wallet_balance) - montantFacture;

    await connection.query(
      "UPDATE users SET wallet_balance = ?, commission_balance = commission_balance + ?, commission_total = commission_total + ? WHERE id = ?",
      [newBalance, commission, commission, userId]
    );

    const [insertResult] = await connection.query(
      `INSERT INTO reabonnements
        (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, commission, type_operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upgrade', NOW())`,
      [userId, numero_abonne, formule, montantFacture, 1, telephoneAbonne, commission]
    );

    const reabonnementId = insertResult.insertId;

    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      [
        "upgrade",
        `🔄 ${user.prenom} ${user.name} a upgradé ${numero_abonne} → ${formule} | Montant : ${montantFacture} FCFA | Commission : ${commission} FCFA${options.length > 0 ? ` | Options : ${options.join(", ")}` : ""}`,
      ]
    );

    await connection.commit();

    // Génération facture
    const partnerName = `${user.prenom || ""} ${user.name}`.trim();
    const factureUrl = genererFacture({
      factureId:      reabonnementId,
      partnerName,
      numero_abonne,
      formule,
      duree:          1,
      montant:        montantFacture,
      commission,
      type_operation: "upgrade",
      date:           new Date(),
      options,
    });

    if (req.io) {
      req.io.emit("new_notification", {
        type:    "upgrade",
        message: `🔄 Upgrade ${formule} — ${numero_abonne}`,
      });
    }

    const whatsappMsg = encodeURIComponent(
      `Upgrade Canal+ réussi pour ${numero_abonne} → ${formule} | Montant : ${montantFacture} FCFA`
    );

    return res.json({
      success:         true,
      message:         "Upgrade effectué avec succès",
      wallet_balance:  newBalance,
      commission,
      montantFacture,
      nouvelleFormule: formule,
      facture_url:     factureUrl,
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

// ── RÉCUPÉRER UNE FACTURE PAR ID DE RÉABONNEMENT ─────────────────────────────
router.get("/facture/:id", auth, async (req, res) => {
  const { id } = req.params;
  const filename = `facture_${id}.html`;
  const filepath = path.join(__dirname, "../invoices", filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Facture introuvable" });
  }

  res.json({ facture_url: `/invoices/${filename}` });
});

module.exports = router;
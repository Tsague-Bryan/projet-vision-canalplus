// routes/reabonnement.js
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const axios   = require("axios");
const auth    = require("../middleware/auth");
const fs      = require("fs");
const path    = require("path");

// ── Mapping codes formules ─────────────────────────────────────────────────────
const optionCodeMap = {
  "Access":"ACDD","Evasion":"EVDD","Évasion":"EVDD",
  "Access+":"ACPDD","Evasion+":"EVPDD","Tout Canal+":"TCADD",
};
const mapOptionCodes = (codes) =>
  Array.isArray(codes) ? codes.map(c => optionCodeMap[c] || c).filter(Boolean) : [];

// ── Noms lisibles des formules ─────────────────────────────────────────────────
const FORMULE_NAMES = {
  ACDD:"Access", EVDD:"Évasion", ACPDD:"Access+", EVPDD:"Évasion+", TCADD:"Tout Canal+",
};

// ══════════════════════════════════════════════════════════════════════════════
// MODE TEST FUJISAT
// ══════════════════════════════════════════════════════════════════════════════
// ✅ CORRECTION : lire la variable d'environnement à chaque appel (pas une seule fois au démarrage)
const isTestMode = () => {
  // On force la relecture à chaque fois
  return String(process.env.FUJISAT_TEST_MODE).toLowerCase().trim() === "true";
};

const callFujisat = async (url, payload) => {
  // ✅ Vérifier le mode test DANS la fonction, pas en dehors
  if (isTestMode()) {
    console.log("🧪 [TEST MODE] Simulation Fujisat activée");
    console.log("🧪 URL cible:", url);
    console.log("🧪 Payload:", JSON.stringify(payload, null, 2));
    // Délai simulé
    await new Promise(r => setTimeout(r, 300));
    return {
      data: {
        success:     true,
        message:     "[TEST MODE] Réabonnement simulé avec succès",
        reference:   `TEST-${Date.now()}`,
        numeroAbonne: payload.numabo,
        formule:     payload.offreCode,
      }
    };
  }

  // Mode réel
  console.log("📤 Envoi réel Fujisat:", url);
  return await axios.post(url, payload, {
    auth:    { username: process.env.FUJISAT_USER, password: process.env.FUJISAT_PASS },
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });
};

// ── Commission depuis la table commission_rules (ou fallback fixe) ────────────
const getCommission = async (connection, formuleCode) => {
  try {
    const code = optionCodeMap[formuleCode] || formuleCode;
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commission_rules'"
    );
    if (tables.length > 0) {
      const [rows] = await connection.query(
        "SELECT commission_actuelle FROM commission_rules WHERE formule_code = ?", [code]
      );
      if (rows.length > 0) return Number(rows[0].commission_actuelle);
    }
  } catch (_) {}
  // Fallback : commissions fixes par palier de 300
  const fallback = { ACDD:300, EVDD:600, ACPDD:900, TCADD:1200 };
  const code = optionCodeMap[formuleCode] || formuleCode;
  return fallback[code] || 300;
};

// ── Génération facture client (ticket compact sans commission) ────────────────
const genererFacture = ({ factureId, nomAbonne, numero_abonne, formule, duree, montant, type_operation, date, options }) => {
  const testMode    = isTestMode();
  const formuleLabel = FORMULE_NAMES[formule] || formule;
  const optionsRows  = (options||[]).map(o=>`<tr><td>Option</td><td>${o}</td></tr>`).join("");
  const testBanner   = testMode
    ? `<div style="background:#fff3cd;border:1px dashed #f59e0b;padding:6px 10px;margin-bottom:12px;border-radius:4px;text-align:center;font-size:10px;color:#92400e;font-weight:bold">⚠ DOCUMENT TEST — SIMULATION</div>`
    : "";

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Facture N°${factureId}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;background:#f5f5f5;display:flex;justify-content:center;padding:30px 10px}
.ticket{background:#fff;width:320px;padding:20px 18px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
.hdr{text-align:center;border-bottom:1px dashed #ccc;padding-bottom:14px;margin-bottom:14px}
.logo{font-size:20px;font-weight:900}.logo .plus{color:#c8102e}
.sub{font-size:9px;color:#888;margin-top:2px;letter-spacing:1px;text-transform:uppercase}
.doc{margin-top:10px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#c8102e}
.meta{display:flex;justify-content:space-between;font-size:9px;color:#555;margin-bottom:12px}
.sec{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
td{font-size:10px;padding:3px 0;vertical-align:top}
td:first-child{color:#666;width:45%}td:last-child{font-weight:bold;text-align:right}
.sep{border:none;border-top:1px dashed #ccc;margin:12px 0}
.total{display:flex;justify-content:space-between;align-items:center;margin-top:4px}
.tl{font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}
.ta{font-size:16px;font-weight:900;color:#c8102e}
.badge{display:block;text-align:center;margin:14px 0 10px;padding:5px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:10px;font-weight:bold;color:#16a34a;letter-spacing:1px}
.cut{border:none;border-top:1px dashed #bbb;margin:18px -18px;position:relative}
.cut-i{position:absolute;top:-8px;left:-4px;font-size:14px;color:#bbb;background:#fff;padding:0 2px}
.foot{text-align:center;font-size:9px;color:#aaa;line-height:1.6}
.foot strong{color:#555}
@media print{body{background:#fff;padding:0}.ticket{box-shadow:none;width:100%;max-width:320px;margin:0 auto}}
</style></head><body><div class="ticket">
${testBanner}
<div class="hdr">
  <div class="logo">VISION CANAL<span class="plus">+</span></div>
  <div class="sub">Grossiste agréé Canal+ Cameroun</div>
  <div class="doc">${type_operation==="upgrade"?"UPGRADE FORMULE":"RÉABONNEMENT"}</div>
</div>
<div class="meta">
  <span>N° <strong>${factureId}</strong></span>
  <span>${new Date(date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})}</span>
  <span>${new Date(date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
</div>
<p class="sec">Informations abonné</p>
<table>${nomAbonne?`<tr><td>Abonné</td><td>${nomAbonne}</td></tr>`:""}<tr><td>N° abonné</td><td>${numero_abonne}</td></tr></table>
<hr class="sep"/>
<p class="sec">Détail opération</p>
<table>
  <tr><td>Formule</td><td>${formuleLabel}</td></tr>
  ${optionsRows}
  ${type_operation!=="upgrade"?`<tr><td>Durée</td><td>${duree} mois</td></tr>`:""}
  <tr><td>Prix formule</td><td>${Number(montant).toLocaleString("fr-FR")} FCFA</td></tr>
</table>
<hr class="sep"/>
<div class="total"><span class="tl">Total</span><span class="ta">${Number(montant).toLocaleString("fr-FR")} FCFA</span></div>
<span class="badge">✓ OPÉRATION VALIDÉE${testMode?" (TEST)":""}</span>
<div class="cut"><span class="cut-i">✂</span></div>
<div class="foot"><strong>Vision Canal+</strong><br/>Douala, Cameroun<br/>Merci de votre confiance !<br/>
<span style="margin-top:4px;display:block">Facture N°${factureId} · ${new Date(date).toLocaleDateString("fr-FR")}</span>
${testMode?`<span style="color:#f59e0b;font-weight:bold;display:block;margin-top:4px">⚠ DOCUMENT TEST</span>`:""}
</div></div></body></html>`;

  const dir = path.join(__dirname, "../invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `facture_${factureId}.html`), html, "utf8");
  return `/invoices/facture_${factureId}.html`;
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/reabonnement — Réabonnement classique
// ══════════════════════════════════════════════════════════════════════════════
router.post("/", auth, async (req, res) => {
  const {
    numero_abonne, formule, duree, montant,
    telephoneAbonne, materialNumber, numeroContrat,
    options = [], nomAbonne = "",
  } = req.body;
  const userId   = req.user.id;
  const testMode = isTestMode();

  console.log(`📋 Réabonnement — TEST_MODE=${testMode}, formule=${formule}, montant=${montant}`);

  const missing = [];
  if (!numero_abonne) missing.push("numero_abonne");
  if (!formule)       missing.push("formule");
  if (!duree)         missing.push("duree");
  if (!montant)       missing.push("montant");
  if (!materialNumber) missing.push("materialNumber");
  if (!numeroContrat)  missing.push("numeroContrat");
  if (!testMode && !telephoneAbonne) missing.push("telephoneAbonne");
  if (missing.length > 0) return res.status(400).json({ error: "Données manquantes", missing });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[u]] = await connection.query(
      "SELECT wallet_balance, name, prenom FROM users WHERE id = ? FOR UPDATE", [userId]
    );
    if (!u) { await connection.rollback(); return res.status(404).json({ error: "Utilisateur introuvable" }); }
    if (Number(u.wallet_balance) < Number(montant)) { await connection.rollback(); return res.status(400).json({ error: "Solde insuffisant" }); }

    // ✅ Appel Fujisat (réel ou simulé selon .env)
    const payload = {
      offreCode:       formule,
      numabo:          numero_abonne,
      materialNumber,
      duree,
      telephoneAbonne: telephoneAbonne || "00237000000000",
      numeroContrat:   Number(numeroContrat) || 1,
      optionCodes:     mapOptionCodes(options),
    };

    let apiResponse;
    try {
      apiResponse = await callFujisat(
        `${process.env.FUJISAT_URL}/public-api/operation/re-subscription/renew`, payload
      );
    } catch (err) {
      await connection.rollback();
      console.error("❌ Fujisat ERROR:", err.response?.data || err.message);
      return res.status(502).json({ error: "Échec du réabonnement Canal+", details: err.response?.data || err.message });
    }

    if (!apiResponse.data?.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Réabonnement refusé par Canal+", details: apiResponse.data });
    }

    // ✅ Commission depuis la table
    const commission = await getCommission(connection, formule);
    const newBalance = Number(u.wallet_balance) - Number(montant);

    await connection.query(
      "UPDATE users SET wallet_balance=?, commission_balance=COALESCE(commission_balance,0)+?, commission_total=COALESCE(commission_total,0)+? WHERE id=?",
      [newBalance, commission, commission, userId]
    );

    const [ins] = await connection.query(
      "INSERT INTO reabonnements (users_id,numero_abonne,formule,montant,duree,telephoneAbonne,commission,type_operation,created_at) VALUES (?,?,?,?,?,?,?,'reabonnement',NOW())",
      [userId, numero_abonne, formule, montant, duree, telephoneAbonne||"", commission]
    );

    const partnerName = `${u.prenom||""} ${u.name}`.trim();
    const notifMsg = `💰 ${partnerName} → ${numero_abonne} (${formule}) — ${Number(montant).toLocaleString()} FCFA | Commission: ${commission} FCFA${testMode?" [TEST]":""}`;
    await connection.query("INSERT INTO notifications (type,message,created_at) VALUES (?,?,NOW())", ["reabonnement", notifMsg]);
    await connection.commit();

    // Génération facture après commit
    const factureUrl = genererFacture({
      factureId:      ins.insertId,
      nomAbonne,
      numero_abonne,
      formule,
      duree,
      montant,
      type_operation: "reabonnement",
      date:           new Date(),
      options,
    });

    if (req.io) req.io.emit("new_notification", { type:"reabonnement", message: notifMsg });

    return res.json({
      success:        true,
      message:        testMode ? "[TEST] Réabonnement simulé avec succès" : "Réabonnement effectué avec succès",
      wallet_balance: newBalance,
      commission,
      facture_url:    factureUrl,
      test_mode:      testMode,
      whatsappLink:   `https://wa.me/237656253864?text=${encodeURIComponent(`Réabonnement Canal+ réussi pour ${numero_abonne} (${formule})`)}`,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 ERREUR reabonnement:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/reabonnement/upgrade — Upgrade de formule
// ══════════════════════════════════════════════════════════════════════════════
router.post("/upgrade", auth, async (req, res) => {
  const {
    numero_abonne, formule, materialNumber, numeroContrat,
    telephoneAbonne = "", options = [], montant, nomAbonne = "",
  } = req.body;
  const userId   = req.user.id;
  const testMode = isTestMode();

  const missing = [];
  if (!numero_abonne) missing.push("numero_abonne");
  if (!formule)       missing.push("formule");
  if (!materialNumber) missing.push("materialNumber");
  if (!numeroContrat)  missing.push("numeroContrat");
  if (!montant || Number(montant) <= 0) missing.push("montant");
  if (missing.length > 0) return res.status(400).json({ error: "Données manquantes", missing });

  const montantFacture = Number(montant);
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[u]] = await connection.query(
      "SELECT wallet_balance, name, prenom FROM users WHERE id = ? FOR UPDATE", [userId]
    );
    if (!u) { await connection.rollback(); return res.status(404).json({ error: "Utilisateur introuvable" }); }
    if (Number(u.wallet_balance) < montantFacture) {
      await connection.rollback();
      return res.status(400).json({ error: `Solde insuffisant. Requis: ${montantFacture} FCFA` });
    }

    const payload = {
      offreCode:      formule,
      numabo:         numero_abonne,
      materialNumber,
      numeroContrat:  Number(numeroContrat) || 1,
      optionCodes:    mapOptionCodes(options),
      montantMensuel: montantFacture,
    };

    let apiResponse;
    try {
      apiResponse = await callFujisat(
        `${process.env.FUJISAT_URL}/public-api/operation/upgrade/execute`, payload
      );
    } catch (err) {
      await connection.rollback();
      return res.status(502).json({ error: "Échec de l'upgrade Canal+", details: err.response?.data || err.message });
    }

    if (!apiResponse.data?.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Upgrade refusé par Canal+", details: apiResponse.data });
    }

    const commission = await getCommission(connection, formule);
    const newBalance = Number(u.wallet_balance) - montantFacture;

    await connection.query(
      "UPDATE users SET wallet_balance=?, commission_balance=COALESCE(commission_balance,0)+?, commission_total=COALESCE(commission_total,0)+? WHERE id=?",
      [newBalance, commission, commission, userId]
    );
    const [ins] = await connection.query(
      "INSERT INTO reabonnements (users_id,numero_abonne,formule,montant,duree,telephoneAbonne,commission,type_operation,created_at) VALUES (?,?,?,?,?,?,?,'upgrade',NOW())",
      [userId, numero_abonne, formule, montantFacture, 1, telephoneAbonne, commission]
    );

    const partnerName = `${u.prenom||""} ${u.name}`.trim();
    const notifMsg = `🔄 ${partnerName} upgrade ${numero_abonne} → ${formule} | ${montantFacture} FCFA | Commission: ${commission} FCFA${testMode?" [TEST]":""}`;
    await connection.query("INSERT INTO notifications (type,message,created_at) VALUES (?,?,NOW())", ["upgrade", notifMsg]);
    await connection.commit();

    const factureUrl = genererFacture({
      factureId:      ins.insertId,
      nomAbonne,
      numero_abonne,
      formule,
      duree:          1,
      montant:        montantFacture,
      type_operation: "upgrade",
      date:           new Date(),
      options,
    });

    if (req.io) req.io.emit("new_notification", { type:"upgrade", message: notifMsg });

    return res.json({
      success:        true,
      message:        testMode ? "[TEST] Upgrade simulé" : "Upgrade effectué avec succès",
      wallet_balance: newBalance,
      commission,
      montantFacture,
      facture_url:    factureUrl,
      test_mode:      testMode,
      whatsappLink:   `https://wa.me/237656253864?text=${encodeURIComponent(`Upgrade Canal+ réussi: ${numero_abonne} → ${formule}`)}`,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 ERREUR upgrade:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── GET facture ────────────────────────────────────────────────────────────────
router.get("/facture/:id", auth, async (req, res) => {
  const fp = path.join(__dirname, "../invoices", `facture_${req.params.id}.html`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: "Facture introuvable" });
  res.json({ facture_url: `/invoices/facture_${req.params.id}.html` });
});

module.exports = router;
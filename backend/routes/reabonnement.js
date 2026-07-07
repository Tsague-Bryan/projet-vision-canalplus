// routes/reabonnement.js
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const axios   = require("axios");
const auth    = require("../middleware/auth");
const fs      = require("fs");
const path    = require("path");
const https   = require("https");
const { calculateAndApplyCommissions, calculateAdminCommission, getFormulaPrices, normalizeCode } = require("../utils/commissionEngine");



// —— Mapping codes formules —————————————————————————————————————————————————————
const optionCodeMap = {
  "Access":          "ACDD",
  "Evasion":         "EVDD",
  "0vasion":         "EVDD",
  "Access+":         "ACPDD",


  "Tout Canal+":     "TCADD",
  "Charme":          "CHARME",
  "CHARME":          "CHARME",
  "charme":          "CHARME",
  "English Basic":   "ENGLISH PLUS DD",
  "English+":        "ENGLISH PLUS DD",
  "English +":       "ENGLISH PLUS DD",
  "ENGLISH+":        "ENGLISH PLUS DD",
  "ENGLISH PLUS DD": "ENGLISH PLUS DD",
};

const englishOptionByOffer = {
  ACDD:  "EAOACDD",
  EVDD:  "EAOEVDD",
  ACPDD: "EAOACPDD",

};

const canalOptionCodeMap = {
  "Charme":           "CHR",
  "CHARME":           "CHR",
  "charme":           "CHR",
  "CHR":              "CHR",
  "Netflix":          "NFX1SMDD",
  "NETFLIX":          "NFX1SMDD",
  "Netflix Basic":    "NFX1SMDD",
  "Netflix Standard": "NFX2SMDD",
  "NETFLIX STANDARD": "NFX2SMDD",
  "Netflix Premium":  "NFX4SMDD",
  "NETFLIX PREMIUM":  "NFX4SMDD",
};

const mapCanalOptionCode = (code, offreCode) => {
  const normalized = optionCodeMap[code] || code;
  if (!normalized) return null;
  if (normalized === "ENGLISH PLUS DD") return englishOptionByOffer[offreCode] || null;
  if (normalized === "CHARME") return "CHR";
  if (normalized === "NFX4SMDD" && offreCode === "TCADD") return "NFX4SHDD";
  return canalOptionCodeMap[normalized] || normalized;
};

const mapOptionCodes = (codes, offreCode) =>
  Array.isArray(codes) ? codes.map(c => mapCanalOptionCode(c, offreCode)).filter(Boolean) : [];

const cleanFujisatValue = (value) => String(value ?? "").trim();

// —— Prix des formules ——————————————————————————————————————————————————————————
const PRIX_FORMULES_FALLBACK = {
  "ACDD":  5000,
  "EVDD":  10500,
  "ACPDD": 15000,

  "TCADD": 28000,
  "ENGLISH PLUS DD": 5000,
  "CHARME": 7000,
};

const NOMS_FORMULES = {
  "ACDD":  "Access",
  "EVDD":  "0vasion",
  "ACPDD": "Access+",

  "TCADD": "Tout Canal+",
  "ENGLISH PLUS DD": "English+",
  "CHARME": "Charme",
};

const UPGRADE_OPTION_CODES = new Set(["ENGLISH PLUS DD", "CHARME"]);

const getDbPriceMap = async (connection, codes = []) => {
  const prices = await getFormulaPrices(connection, codes);
  const positivePrices = Object.fromEntries(
    Object.entries(prices).filter(([, price]) => Number(price) > 0)
  );
  return { ...PRIX_FORMULES_FALLBACK, ...positivePrices };
};

// —— Helpers ———————————————————————————————————————————————————————————————————
const isTestMode = async () => {
  try {
    const [[row]] = await pool.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_test_mode' LIMIT 1");
    if (row) return String(row.valeur).toLowerCase().trim() === "true";
  } catch (_) {}
  return String(process.env.FUJISAT_TEST_MODE).toLowerCase().trim() === "true";
};
const fujisatBaseUrl = () => String(process.env.FUJISAT_URL || "").replace(/\/+$/, "");

const createFujisatAgent = () => new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
  maxCachedSessions: 0,
  sessionIdContext: `fujisat-${Date.now()}`,
});

const fujisatErrorPayload = (err) => ({
  status:  err.response?.status || null,
  data:    err.response?.data || null,
  message: err.response?.data?.message || err.response?.data?.error || err.message,
  code:    err.code || null,
  url:     err.config?.url || null,
});
const callFujisat = async (url, payload) => {
  console.log("x FUJISAT URL:", url);
  console.log("x FUJISAT PAYLOAD:", JSON.stringify(payload));

  if (await isTestMode()) {
    console.log("x [TEST MODE] Simulation Fujisat");
    await new Promise(r => setTimeout(r, 400));
    const debut    = new Date();
    const fin      = new Date(debut);
    fin.setMonth(fin.getMonth() + (Number(payload.duree) || 1));
    fin.setDate(fin.getDate() - 1);
    return {
      data: {
        success:   true,
        message:   "[TEST MODE] Opération simulée avec succès",
        reference: `TEST-${Date.now()}`,
        numabo:    payload.numabo,
        offreCode: payload.offreCode,
        debabo:    debut.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        finabo:    fin.toLocaleDateString("fr-FR",   { day: "2-digit", month: "2-digit", year: "numeric" }),
      }
    };
  }

  let fujiUser = process.env.FUJISAT_USER;
  let fujiPass = process.env.FUJISAT_PASS;
  try {
    const [[userRow]] = await pool.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_user' LIMIT 1");
    const [[passRow]] = await pool.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_pass' LIMIT 1");
    if (userRow) fujiUser = userRow.valeur;
    if (passRow) fujiPass = passRow.valeur;
  } catch (e) {
    console.warn("Impossible de récupérer les identifiants Fujisat depuis la BDD, repli vers .env");
  }

  try {
    const response = await axios({
      method: "POST",
      url,
      data: payload,
      timeout: 300000,
      maxRedirects: 5,
      httpsAgent: createFujisatAgent(),
      auth: {
        username: fujiUser,
        password: fujiPass,
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": process.env.FUJISAT_USER_AGENT || "PostmanRuntime/7.43.0",
        "Expect": "",
      },
    });

    console.log(" FUJISAT STATUS:", response.status);
    console.log(" FUJISAT DATA:", response.data);
    return response;
  } catch (err) {
    console.error(" FUJISAT ERREUR:", {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      data: err.response?.data,
    });
    throw err;
  }
};

const callFujisatRenew = async (payload) => {
  const configuredPath = process.env.FUJISAT_RENEW_PATH || "/public-api/operation/re-subscription/renew";
  const paths = [...new Set([
    configuredPath,
    "/public-api/operation/re-subscription/execute",
    "/public-api/operation/resubscription/renew",
  ])];
  let lastError;

  for (const p of paths) {
    const url = /^https?:\/\//i.test(p) ? p : `${fujisatBaseUrl()}${p.startsWith("/") ? p : `/${p}`}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(` Fujisat tentative ${attempt}/3   ${url}`);
        return await callFujisat(url, payload);
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const isReset = err.code === "ECONNRESET" || err.message?.includes("ECONNRESET");
        const isTimeout = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";

        if ([404, 405].includes(status)) break;

        if ((isReset || isTimeout) && attempt < 3) {
          const delay = attempt * 2000;
          console.warn(` ${err.code}   attente ${delay}ms avant tentative ${attempt + 1}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!isReset && !isTimeout) break;
      }
    }

    const status = lastError?.response?.status;
    if (![404, 405].includes(status)) throw lastError;
  }

  throw lastError;
};

// —— Calcul de la date de fin correcte —————————————————————————————————————————
// Règle : si réabonnement le 04 mai   fin le 03 juin (pas le 04 juin)
const calculerDateFin = (dateDebutStr, duree) => {
  try {
    // dateDebutStr peut être au format dd/mm/yyyy ou yyyy-mm-dd
    let debut;
    if (dateDebutStr && dateDebutStr.includes("/")) {
      const [d, m, y] = dateDebutStr.split("/");
      debut = new Date(Number(y), Number(m) - 1, Number(d));
    } else if (dateDebutStr) {
      debut = new Date(dateDebutStr);
    } else {
      debut = new Date();
    }
    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + (Number(duree) || 1));
    fin.setDate(fin.getDate() - 1); //  -1 jour
    return fin.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
};

// —— Génération facture HTML ———————————————————————————————————————————————————
const genererFacture = ({
  factureId, partnerName, partnerPhone, partnerLocation, nomAbonne, numero_abonne,
  materialNumber, formule, duree, montant, type_operation, dateDebut, dateFin,
  numeroContrat, options, testMode = false,
}) => {
  const formuleLabel = NOMS_FORMULES[formule] || formule;
  const dateOp       = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const optionsRows  = (options || []).map(o => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${o}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">—</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Facture N°${factureId}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px}
.page{max-width:700px;margin:0 auto;border:1px solid #000;padding:0}
.header-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:2px solid #000}
.logo-canal{font-size:22px;font-weight:900;color:#003087;letter-spacing:-1px}
.company-info{text-align:center;flex:1;padding:0 20px;font-size:10px;line-height:1.6}
.company-info strong{font-size:12px;display:block;margin-bottom:4px}
.title-bar{background:#111;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:bold;letter-spacing:1px}
.section{padding:10px 16px;border-bottom:1px solid #ccc}
.section-title{font-weight:bold;font-size:10px;text-transform:uppercase;margin-bottom:6px;background:#f3f4f6;padding:3px 6px;border-left:3px solid #003087}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.field{display:flex;gap:4px;font-size:10px;line-height:1.7}
.field .label{font-weight:bold;min-width:130px;flex-shrink:0}
table.bouquet{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}
table.bouquet thead tr{background:#111;color:#fff}
table.bouquet thead th{padding:6px 10px;text-align:left;font-size:10px}
table.bouquet tbody td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
.total-row{background:#f9f9f9;font-weight:bold}
.total-row td{padding:8px 10px;border-top:2px solid #000;font-size:12px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:12px 16px;border-top:1px solid #ccc;margin-top:4px}
.sig-box{border:1px solid #ccc;padding:8px;min-height:60px;font-size:10px;font-weight:bold}
.footer-note{padding:8px 16px;font-size:9px;color:#555;border-top:1px solid #ccc;line-height:1.6}
.test-banner{background:#fff3cd;border:2px dashed #f59e0b;padding:6px;text-align:center;font-size:10px;font-weight:bold;color:#92400e;margin:4px 16px}
@media print{body{padding:0}.page{border:none}}
</style>
</head>
<body>
<div class="page">

  ${testMode ? `<div class="test-banner">⚠ DOCUMENT TEST — Aucune opération réelle effectuée</div>` : ""}

  <div class="header-top">
    <div class="logo-canal"><strong>VISION CANAL+</strong></div>
    <div class="company-info">
      <strong>Grossiste agréé Canal+ Cameroun</strong>
      ${partnerLocation || "Cameroun"}<br/>
      Tel : ${partnerPhone || "+237 656 253 864"}
    </div>
    <div style="text-align:right;font-size:10px">
      <div>Date : <strong>${dateOp}</strong></div>
      <div>Réf : <strong>N°${factureId}</strong></div>
      ${testMode ? '<div style="color:#f59e0b;font-weight:bold">⚠ TEST</div>' : ""}
    </div>
  </div>

  <div class="title-bar">
    ${type_operation === "upgrade" ? "UPGRADE DE FORMULE" : "RÉABONNEMENT CANAL+"} N° ${factureId}
  </div>

  <div class="section">
    <div class="section-title">Informations de l'abonné — N° ${numero_abonne}</div>
    <div class="grid-2">
      <div class="field"><span class="label">Nom :</span><span class="val">${nomAbonne || "-"}</span></div>
      <div class="field"><span class="label">N° abonné :</span><span class="val">${numero_abonne}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Matériel de l'abonné — Date de l'opération</div>
    <div class="grid-2">
      <div class="field"><span class="label">N° Décodeur :</span><span class="val">${materialNumber || "-"}</span></div>
      <div class="field"><span class="label">Date de l'opération :</span><span class="val">${dateOp}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Contrat d'abonnement N° ${numeroContrat || "—"}</div>
    <div class="grid-2">
      <div class="field"><span class="label">Durée :</span><span class="val">${duree || 1} Mois</span></div>
      <div class="field"><span class="label">Mode de règlement :</span><span class="val">Portefeuille numérique</span></div>
      <div class="field"><span class="label">Date de début :</span><span class="val">${dateDebut || dateOp}</span></div>
      <div class="field"><span class="label">Date de fin :</span><span class="val">${dateFin || calculerDateFin(dateDebut || dateOp, duree) || "-"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Composition du bouquet — Montants payés</div>
    <table class="bouquet">
      <thead>
        <tr><th>DÉSIGNATION</th><th style="text-align:right">MONTANT TTC</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${formuleLabel}${type_operation === "upgrade" ? " (Upgrade)" : ""}</td>
          <td style="text-align:right">${Number(montant).toLocaleString("fr-FR")} FCFA</td>
        </tr>
        ${optionsRows}
        <tr class="total-row">
          <td>TOTAL TTC</td>
          <td style="text-align:right">${Number(montant).toLocaleString("fr-FR")} F.CFA</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:6px;font-size:10px;font-style:italic;color:#555">
      Arrêté la présente facture à la somme de <strong>${Number(montant).toLocaleString("fr-FR")} francs CFA</strong>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">Signature de l'agent<br/><br/><span style="font-weight:normal;font-size:10px">${partnerName}</span></div>
    <div class="sig-box">Signature du client<br/><br/><span style="font-weight:normal;font-size:10px">${nomAbonne || "-"}</span></div>
  </div>

  <div class="footer-note">
    Pour toute réclamation, veuillez contacter votre agent au ${partnerPhone || "+237 656 253 864"}.<br/>
    <strong>Prière de conserver précieusement ce reçu car il vous sera demandé pour toute réclamation.</strong>
    ${testMode ? '<br/><span style="color:#f59e0b;font-weight:bold">⚠ DOCUMENT GÉNÉRÉ EN MODE TEST — NON VALABLE</span>' : ""}
  </div>

</div>
</body>
</html>`;

  const dir = path.join(__dirname, "../invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `facture_${factureId}.html`), html, "utf8");
  return `/invoices/facture_${factureId}.html`;
};

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// POST /api/reabonnement — Réabonnement classique
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
router.post("/", auth, async (req, res) => {
  const {
    numero_abonne, formule, duree, montant,
    telephoneAbonne, materialNumber, numeroContrat,
    options = [], nomAbonne = "",
  } = req.body;
  const userId   = req.user.id;
  const testMode = await isTestMode();
  const formuleCode = optionCodeMap[formule] || cleanFujisatValue(formule);
  const numabo = cleanFujisatValue(numero_abonne);
  const decoder = cleanFujisatValue(materialNumber);
  const phone = cleanFujisatValue(telephoneAbonne);
  console.log(`x9 Réabonnement — TEST_MODE=${testMode}, formule=${formule}, montant=${montant}`);

  const missing = [];
  if (!numero_abonne)  missing.push("numero_abonne");
  if (!formule)        missing.push("formule");
  if (!duree)          missing.push("duree");
  if (!montant)        missing.push("montant");
  if (!materialNumber) missing.push("materialNumber");
  if (!numeroContrat)  missing.push("numeroContrat");
  if (!testMode && !telephoneAbonne) missing.push("telephoneAbonne");
  if (missing.length > 0) return res.status(400).json({ error: "Données manquantes", missing });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const priceMap = await getDbPriceMap(connection, [formuleCode, ...options]);
    const optionTotal = options.reduce((sum, option) => sum + (priceMap[normalizeCode(option)] || 0), 0);
    const montantCalcule = ((priceMap[formuleCode] || Number(montant) || 0) + optionTotal) * (Number(duree) || 1);

    //  On récupère aussi telephone, ville, quartier du partenaire pour la facture
    const [[u]] = await connection.query(
      "SELECT wallet_balance, name, prenom, telephone, ville, quartier FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    if (!u) { await connection.rollback(); return res.status(404).json({ error: "Utilisateur introuvable" }); }
    if (Number(u.wallet_balance) < Number(montantCalcule)) {
      await connection.rollback();
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const mappedOptions = mapOptionCodes(options, formule);
    const payload = {
      offreCode:       formule,
      numabo:          numero_abonne,
      materialNumber,
      numeroContrat:   Number(numeroContrat) || 1,
      duree:           Number(duree) || 1,
      telephoneAbonne,
      optionCode:      mappedOptions[0] || "",
    };

    let apiResponse;
    try {
      apiResponse = await callFujisatRenew(payload);
    } catch (err) {
      const details = fujisatErrorPayload(err);
      console.error("Echec Fujisat reabonnement:", details);
      await connection.rollback();
      return res.status(502).json({ error: "Echec du reabonnement Canal+", details });
      return res.status(502).json({ error: "0chec du réabonnement Canal+", details: err.response?.data || err.message });
    }
    if (!apiResponse.data?.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Réabonnement refusé par Canal+", details: apiResponse.data });
    }

    //  Commissions partenaire (avec fix English+/Charme via commissionEngine corrigé)
    const commissionResult = await calculateAndApplyCommissions(connection, {
      formule,
      options,
      montant: montantCalcule,
      userId,
      numeroAbonne:  numero_abonne,
      operationType: "reabonnement",
    });
    const commission = commissionResult.total;
    const newBalance = Number(u.wallet_balance) - Number(montantCalcule);

    //  Calcul correct de la date de fin (début + durée - 1 jour)
    const dateDebutBrut = apiResponse.data?.debabo || null;
    let dateDebut = dateDebutBrut;
    let dateFin   = calculerDateFin(dateDebutBrut, duree);

    await connection.query(
      "UPDATE users SET wallet_balance=?, commission_balance=COALESCE(commission_balance,0)+?, commission_total=COALESCE(commission_total,0)+? WHERE id=?",
      [newBalance, commission, commission, userId]
    );

    const [ins] = await connection.query(
      `INSERT INTO reabonnements
         (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, commission, type_operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'reabonnement', NOW())`,
      [userId, numero_abonne, formule, montantCalcule, duree, telephoneAbonne || "", commission]
    );

    const partnerName     = `${u.prenom || ""} ${u.name}`.trim();
    //  Infos partenaire dynamiques sur la facture
    const partnerPhone    = u.telephone || "+237 656 253 864";
    const partnerLocation = [u.ville, u.quartier].filter(Boolean).join(", ") || "Cameroun";

    await connection.query(
      "INSERT INTO notifications (type,message,created_at) VALUES (?,?,NOW())",
      ["reabonnement", ` ${partnerName}   ${numero_abonne} (${formule}) — ${Number(montantCalcule).toLocaleString()} FCFA | Commission: ${commission} FCFA${testMode ? " [TEST]" : ""}`]
    );

    await calculateAdminCommission(connection, {
      reabonnementId: ins.insertId,
      userId,
      numeroAbonne:   numero_abonne,
      formuleCode:    formule,
      formuleName:    NOMS_FORMULES[formule] || formule,
      montant:        Number(montantCalcule),
      tauxAdmin:      6,
    });
    await connection.commit();

    const factureUrl = genererFacture({
      factureId:       ins.insertId,
      partnerName,
      partnerPhone,
      partnerLocation,
      nomAbonne,
      numero_abonne,
      materialNumber,
      formule,
      duree,
      montant:         montantCalcule,
      type_operation:  "reabonnement",
      dateDebut,
      dateFin,
      numeroContrat,
      options,
      testMode,
    });

    if (req.io) {
      req.io.emit("new_notification",      { type: "reabonnement", message: ` Réabonnement ${formule} — ${numero_abonne}` });
      req.io.emit("commission_rules_update", { type: "reabonnement", formule });
      req.io.emit("admin_dashboard_update", { type: "reabonnement", user_id: userId });
      req.io.emit(`partner_dashboard_update_${userId}`, { type: "reabonnement" });
    }

    let adminWhatsapp = "237695225823";
    try {
      const [[waRow]] = await connection.query("SELECT valeur FROM app_config WHERE cle = 'admin_whatsapp' LIMIT 1");
      if (waRow) adminWhatsapp = waRow.valeur;
    } catch (e) {}

    return res.json({
      success:            true,
      message:            testMode ? "[TEST] Réabonnement simulé" : "Réabonnement effectué avec succès",
      wallet_balance:     newBalance,
      commission,
      commission_details: commissionResult.details,
      facture_url:        factureUrl,
      test_mode:          testMode,
      whatsappLink:       `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(`Réabonnement Canal+ réussi pour ${numero_abonne} (${NOMS_FORMULES[formule] || formule})`)}`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("x— ERREUR reabonnement:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// POST /api/reabonnement/upgrade — Upgrade de formule
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
router.post("/upgrade", auth, async (req, res) => {
  const {
    numero_abonne, formule, materialNumber, numeroContrat,
    telephoneAbonne = "", options = [],
    montant,
    formuleActuelle,
    nomAbonne = "",
  } = req.body;
  const userId   = req.user.id;
  const testMode = await isTestMode();

  const missing = [];
  if (!numero_abonne)  missing.push("numero_abonne");
  if (!formule)        missing.push("formule");
  if (!materialNumber) missing.push("materialNumber");
  if (!numeroContrat)  missing.push("numeroContrat");
  if (missing.length > 0) return res.status(400).json({ error: "Données manquantes", missing });

  const formuleCode    = optionCodeMap[formule] || formule;
  const currentCode    = formuleActuelle ? (optionCodeMap[formuleActuelle] || formuleActuelle) : null;
  const prixNouvelle   = PRIX_FORMULES_FALLBACK[formuleCode] || Number(montant) || 0;
  const prixActuelle   = currentCode ? (PRIX_FORMULES_FALLBACK[currentCode] || 0) : 0;
  const montantFacture = UPGRADE_OPTION_CODES.has(formuleCode)
    ? prixNouvelle
    : prixActuelle > 0
      ? Math.max(0, prixNouvelle - prixActuelle)
      : Number(montant) || 0;

  console.log(` Upgrade: ${formuleActuelle}(${prixActuelle})   ${formule}(${prixNouvelle}) = delta ${montantFacture}`);

  if (montantFacture <= 0 && !testMode) {
    return res.status(400).json({ error: `Montant invalide. Calcul: ${prixNouvelle} - ${prixActuelle} = ${montantFacture} FCFA` });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const priceMap = await getDbPriceMap(connection, [formuleCode, currentCode, ...options].filter(Boolean));
    const prixNouvelle = priceMap[formuleCode] || Number(montant) || 0;
    const prixActuelle = currentCode ? (priceMap[currentCode] || 0) : 0;
    const optionsTotal = options.reduce((sum, option) => sum + (priceMap[normalizeCode(option)] || 0), 0);
    const montantFacture = UPGRADE_OPTION_CODES.has(formuleCode)
      ? prixNouvelle + optionsTotal
      : prixActuelle > 0
        ? Math.max(0, prixNouvelle - prixActuelle) + optionsTotal
        : (Number(montant) || 0) + optionsTotal;

    const [[u]] = await connection.query(
      "SELECT wallet_balance, name, prenom, telephone, ville, quartier FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    if (!u) { await connection.rollback(); return res.status(404).json({ error: "Utilisateur introuvable" }); }
    if (!testMode && Number(u.wallet_balance) < montantFacture) {
      await connection.rollback();
      return res.status(400).json({ error: `Solde insuffisant. Requis: ${montantFacture} FCFA, Disponible: ${u.wallet_balance} FCFA` });
    }

    const payload = {
      offreCode:      formule,
      numabo:         numero_abonne,
      materialNumber,
      numeroContrat:  Number(numeroContrat) || 1,
      optionCodes:    mapOptionCodes(options, formule),
      montantMensuel: montantFacture,
    };

    let apiResponse;
    try {
      apiResponse = await callFujisat(`${fujisatBaseUrl()}/public-api/operation/upgrade/execute`, payload);
    } catch (err) {
      await connection.rollback();
      return res.status(502).json({ error: "0chec de l'upgrade Canal+", details: err.response?.data || err.message });
    }
    if (!apiResponse.data?.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Upgrade refusé par Canal+", details: apiResponse.data });
    }

    //  Pour English+ et Charme upgradés directement comme formule principale,
    // on s'assure que le montant utilisé est le prix réel de l'option
    const montantPourCommission = priceMap[formuleCode] || montantFacture;

    const commissionResult = await calculateAndApplyCommissions(connection, {
      formule,
      options,
      montant: montantPourCommission,
      userId,
      numeroAbonne:  numero_abonne,
      operationType: "upgrade",
    });
    const commission = commissionResult.total;
    const newBalance = Number(u.wallet_balance) - (testMode ? 0 : montantFacture);

    await connection.query(
      "UPDATE users SET wallet_balance=?, commission_balance=COALESCE(commission_balance,0)+?, commission_total=COALESCE(commission_total,0)+? WHERE id=?",
      [newBalance, commission, commission, userId]
    );

    const [ins] = await connection.query(
      `INSERT INTO reabonnements
         (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, commission, type_operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upgrade', NOW())`,
      [userId, numero_abonne, formule, montantFacture, 1, telephoneAbonne, commission]
    );

    const partnerName     = `${u.prenom || ""} ${u.name}`.trim();
    const partnerPhone    = u.telephone || "+237 656 253 864";
    const partnerLocation = [u.ville, u.quartier].filter(Boolean).join(", ") || "Cameroun";

    await connection.query(
      "INSERT INTO notifications (type,message,created_at) VALUES (?,?,NOW())",
      ["upgrade", ` ${partnerName} upgrade ${numero_abonne}   ${formule} | ${montantFacture} FCFA | Commission: ${commission} FCFA${testMode ? " [TEST]" : ""}`]
    );

    //  Commission admin 6% sur upgrade aussi
    await calculateAdminCommission(connection, {
      reabonnementId: ins.insertId,
      userId,
      numeroAbonne:   numero_abonne,
      formuleCode:    formule,
      formuleName:    NOMS_FORMULES[formule] || formule,
      montant:        montantFacture,
      tauxAdmin:      6,
    });

    await connection.commit();

    //  Pour les upgrades : dateDebut/dateFin = même que la formule existante
    // On récupère depuis la réponse API si disponible
    const dateDebutUpgrade = apiResponse.data?.debabo || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const dateFinUpgrade   = apiResponse.data?.finabo  || calculerDateFin(dateDebutUpgrade, 1);

    const factureUrl = genererFacture({
      factureId:       ins.insertId,
      partnerName,
      partnerPhone,
      partnerLocation,
      nomAbonne,
      numero_abonne,
      materialNumber,
      formule,
      duree:           1,
      montant:         montantFacture,
      type_operation:  "upgrade",
      dateDebut:       dateDebutUpgrade,
      dateFin:         dateFinUpgrade,
      numeroContrat,
      options,
      testMode,
    });

    if (req.io) {
      req.io.emit("new_notification",      { type: "upgrade", message: ` Upgrade ${formule} — ${numero_abonne}` });
      req.io.emit("commission_rules_update", { type: "upgrade", formule });
      req.io.emit("admin_dashboard_update", { type: "upgrade", user_id: userId });
      req.io.emit(`partner_dashboard_update_${userId}`, { type: "upgrade" });
    }

    let adminWhatsapp = "237695225823";
    try {
      const [[waRow]] = await connection.query("SELECT valeur FROM app_config WHERE cle = 'admin_whatsapp' LIMIT 1");
      if (waRow) adminWhatsapp = waRow.valeur;
    } catch (e) {}

    return res.json({
      success:            true,
      message:            testMode ? "[TEST] Upgrade simulé" : "Upgrade effectué avec succès",
      wallet_balance:     newBalance,
      commission,
      commission_details: commissionResult.details,
      montantFacture,
      prixNouvelle,
      prixActuelle,
      nouvelleFormule:    formule,
      facture_url:        factureUrl,
      test_mode:          testMode,
      whatsappLink:       `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(`Upgrade Canal+ réussi: ${numero_abonne}   ${NOMS_FORMULES[formule] || formule}`)}`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("x— ERREUR upgrade:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/facture/:id", auth, async (req, res) => {
  const fp = path.join(__dirname, "../invoices", `facture_${req.params.id}.html`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: "Facture introuvable" });
  res.json({ facture_url: `/invoices/facture_${req.params.id}.html` });
});

module.exports = router;

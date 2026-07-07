const express = require("express");
const axios = require("axios");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const { calculateAdminCommission, getFormulaPrice } = require("../utils/commissionEngine");

const isTestMode = async () => {
  try {
    const [[row]] = await db.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_test_mode' LIMIT 1");
    if (row) return String(row.valeur).toLowerCase().trim() === "true";
  } catch (_) {}
  return String(process.env.FUJISAT_TEST_MODE).toLowerCase().trim() === "true";
};

const PRIX_FORMULES = {
  ACDD: 5000,
  EVDD: 10500,
  ACPDD: 15000,
  TCADD: 28000,
};

const NOMS_FORMULES = {
  ACDD: "Access",
  EVDD: "Evasion",
  ACPDD: "Access+",
  TCADD: "Tout Canal+",
};

const normalizeLocalPhone = (phone = "") => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00237") && digits.length === 14) return digits.slice(5);
  if (digits.startsWith("237") && digits.length === 12) return digits.slice(3);
  return digits;
};

const validHumanText = (value = "") => /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/.test(String(value || "").trim());

const formatPhone = (phone) => {
  if (!phone) return "";
  let clean = String(phone).replace(/\D/g, "");
  if (clean.startsWith("00237") && clean.length === 14) return clean;
  if (clean.startsWith("237") && clean.length === 12) return `00${clean}`;
  if (clean.length === 9) return `00237${clean}`;
  return clean;
};

const subscriptionEndpoint = () => {
  const configured = process.env.FUJISAT_SUBSCRIPTION_PATH || "/public-api/operation/subscription/execute";
  if (/^https?:\/\//i.test(configured)) return configured;
  return `${process.env.FUJISAT_URL}${configured.startsWith("/") ? configured : `/${configured}`}`;
};

const callFujisatSubscription = async (payload) => {
  if (await isTestMode()) {
    console.log("[TEST MODE] Simulation abonnement Fujisat");
    console.log("Payload abonnement:", JSON.stringify(payload, null, 2));
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      data: {
        success: true,
        message: "[TEST MODE] Abonnement simule avec succes",
        reference: `TEST-ABO-${Date.now()}`,
        materialNumber: payload.materialNumber,
        offreCode: payload.offreCode,
      },
    };
  }

  let fujiUser = process.env.FUJISAT_USER;
  let fujiPass = process.env.FUJISAT_PASS;
  try {
    const [[userRow]] = await db.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_user' LIMIT 1");
    const [[passRow]] = await db.query("SELECT valeur FROM app_config WHERE cle = 'fujisat_pass' LIMIT 1");
    if (userRow) fujiUser = userRow.valeur;
    if (passRow) fujiPass = passRow.valeur;
  } catch (e) {
    console.warn("Impossible de récupérer les identifiants Fujisat depuis la BDD, repli vers .env");
  }

  return axios.post(subscriptionEndpoint(), payload, {
    auth: { username: fujiUser, password: fujiPass },
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });
};

router.post("/abonnements", auth, async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const {
      nom,
      telephone,
      decodeur,
      formule = "ACDD",
      duree = 1,
      adresse,
      ville,
      quartier,
    } = req.body;

    const localPhone = normalizeLocalPhone(telephone);
    if (!nom || !telephone || !decodeur || !formule) {
      return res.status(400).json({ message: "Nom, téléphone, décodeur et formule sont obligatoires" });
    }
    if (!validHumanText(nom)) return res.status(400).json({ message: "Nom invalide." });
    if (!/^\d{9}$/.test(localPhone)) return res.status(400).json({ message: "Le téléphone doit contenir exactement 9 chiffres." });
    if (!/^\d+$/.test(String(decodeur))) return res.status(400).json({ message: "Numéro de décodeur invalide." });
    if (Number(duree) < 1 || Number(duree) > 12) return res.status(400).json({ message: "La durée doit être comprise entre 1 et 12 mois." });
    if ((ville && !validHumanText(ville)) || (quartier && !validHumanText(quartier))) {
      return res.status(400).json({ message: "Ville ou quartier invalide." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [check] = await connection.query(
      `SELECT * FROM decodeurs
       WHERE numero = ?
       AND partner_id = ?
       AND status = 'free'`,
      [decodeur, userId]
    );

    if (check.length === 0) {
      await connection.rollback();
      return res.status(403).json({ message: "Decodeur invalide ou deja utilise" });
    }

    const payload = {
      materialNumber: decodeur,
      offreCode: formule,
      duree: Number(duree) || 1,
      nomAbonne: nom,
      telephoneAbonne: formatPhone(localPhone),
      adresse,
      ville,
      quartier,
    };

    let apiResponse;
    try {
      apiResponse = await callFujisatSubscription(payload);
    } catch (err) {
      await connection.rollback();
      return res.status(502).json({
        message: "Echec de l'abonnement Canal+",
        details: err.response?.data || err.message,
      });
    }

    if (!apiResponse.data?.success) {
      await connection.rollback();
      return res.status(400).json({
        message: "Abonnement refuse par Fujisat",
        details: apiResponse.data,
      });
    }

    await connection.query(
      `INSERT INTO abonnements (nom, telephone, decodeur, adresse, ville, quartier, partner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nom, localPhone, decodeur, adresse, ville, quartier, userId]
    );

    await connection.query(
      `UPDATE decodeurs SET status = 'used'
       WHERE numero = ? AND partner_id = ?`,
      [decodeur, userId]
    );
   // ✅ Lire la commission abonnement depuis la config (avec fallback 2000)
    let commissionAbonnement = 2000;
try {
  const [[config]] = await connection.query(
    "SELECT valeur FROM app_config WHERE cle = 'commission_abonnement' LIMIT 1"
  );
  if (config) commissionAbonnement = Number(config.valeur) || 2000;
} catch (e) {
  // table absente → on garde 2000
}
const PRIX_FORMULES_BACKEND_LOCAL = {

};
const getFormulePrice = async (code) => (await getFormulaPrice(connection, code)) || PRIX_FORMULES_BACKEND_LOCAL[code] || 0;

// ✅ Ajouter aussi la commission du forfait (4% du prix)
const PRIX_FORMULES = {
  "ACDD": 5000, "EVDD": 10500, "ACPDD": 15000,

};
const prixForfait = await getFormulePrice(formule);
const commissionForfait = Math.round((prixForfait || 5000) * 0.04);
const commissionTotale = commissionAbonnement + commissionForfait;

await connection.query(
  "UPDATE users SET commission_balance = COALESCE(commission_balance,0) + ?, commission_total = COALESCE(commission_total,0) + ? WHERE id = ?",
  [commissionTotale, commissionTotale, userId]
);
    const montantAbonnement = (prixForfait || 5000) * (Number(duree) || 1);
    const [hist] = await connection.query(
      `INSERT INTO reabonnements
         (users_id, numero_abonne, formule, montant, duree, telephoneAbonne, commission, type_operation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'abonnement', NOW())`,
      [userId, apiResponse.data?.numabo || decodeur, formule, montantAbonnement, Number(duree) || 1, localPhone, commissionTotale]
    );
    await calculateAdminCommission(connection, {
      reabonnementId: hist.insertId,
      userId,
      numeroAbonne: apiResponse.data?.numabo || decodeur,
      formuleCode: formule,
      formuleName: NOMS_FORMULES[formule] || formule,
      montant: montantAbonnement,
      tauxAdmin: 6,
    });
    await connection.commit();
// ✅ Génération de la facture abonnement
const path = require("path");
const fs   = require("fs");

const [[partnerData]] = await db.query(
  "SELECT name, prenom, telephone, ville, quartier FROM users WHERE id = ?",
  [userId]
);

const factureId      = hist.insertId;
const partnerName    = `${partnerData?.prenom || ""} ${partnerData?.name || ""}`.trim();
const partnerPhone   = partnerData?.telephone || "+237 656 253 864";
const partnerLoc     = [partnerData?.ville, partnerData?.quartier].filter(Boolean).join(", ") || "Cameroun";
const dateOp         = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Facture Abonnement N°${factureId}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px}
.page{max-width:700px;margin:0 auto;border:1px solid #000;padding:0}
.header-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:2px solid #000}
.logo{font-size:22px;font-weight:900;color:#003087}
.title-bar{background:#111;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:bold;letter-spacing:1px}
.section{padding:10px 16px;border-bottom:1px solid #ccc}
.section-title{font-weight:bold;font-size:10px;text-transform:uppercase;margin-bottom:6px;background:#f3f4f6;padding:3px 6px;border-left:3px solid #003087}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.field{display:flex;gap:4px;font-size:10px;line-height:1.7}
.field .label{font-weight:bold;min-width:120px;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}
thead tr{background:#111;color:#fff}
thead th{padding:6px 10px;text-align:left;font-size:10px}
tbody td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
.total-row{background:#f9f9f9;font-weight:bold}
.total-row td{padding:8px 10px;border-top:2px solid #000;font-size:12px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:12px 16px}
.sig-box{border:1px solid #ccc;padding:8px;min-height:60px;font-size:10px;font-weight:bold}
.footer-note{padding:8px 16px;font-size:9px;color:#555;border-top:1px solid #ccc;line-height:1.6}
</style></head><body>
<div class="page">
  <div class="header-top">
    <div class="logo"><strong>VISION CANAL+</strong></div>
    <div style="text-align:center;flex:1;padding:0 20px;font-size:10px;line-height:1.6">
      <strong style="font-size:12px;display:block">Grossiste agréé Canal+ Cameroun</strong>
      ${partnerLoc}<br/>Tel : ${partnerPhone}
    </div>
    <div style="text-align:right;font-size:10px">
      <div>Date : <strong>${dateOp}</strong></div>
      <div>Réf : <strong>N°${factureId}</strong></div>
    </div>
  </div>
  <div class="title-bar">ABONNEMENT CANAL+ N° ${factureId}</div>
  <div class="section">
    <div class="section-title">Informations de l'abonné</div>
    <div class="grid-2">
      <div class="field"><span class="label">Nom :</span><span>${nom}</span></div>
      <div class="field"><span class="label">Téléphone :</span><span>${telephone}</span></div>
      <div class="field"><span class="label">Décodeur :</span><span>${decodeur}</span></div>
      <div class="field"><span class="label">Ville :</span><span>${ville || "—"}</span></div>
      <div class="field"><span class="label">Quartier :</span><span>${quartier || "—"}</span></div>
      <div class="field"><span class="label">Adresse :</span><span>${adresse || "—"}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Détails de l'abonnement</div>
    <table>
      <thead><tr><th>DÉSIGNATION</th><th style="text-align:right">MONTANT TTC</th></tr></thead>
      <tbody>
        <tr><td>Abonnement ${NOMS_FORMULES[formule] || formule} — ${duree} mois</td><td style="text-align:right">${montantAbonnement.toLocaleString("fr-FR")} FCFA</td></tr>
        <tr class="total-row"><td>TOTAL TTC</td><td style="text-align:right">${montantAbonnement.toLocaleString("fr-FR")} F.CFA</td></tr>
      </tbody>
    </table>
  </div>
  <div class="signatures">
    <div class="sig-box">Signature de l'agent<br/><br/>${partnerName}</div>
    <div class="sig-box">Signature du client<br/><br/>${nom}</div>
  </div>
  <div class="footer-note">
    Pour toute réclamation : ${partnerPhone}.<br/>
    <strong>Prière de conserver ce reçu.</strong>
  </div>
</div></body></html>`;

const invoicesDir = path.join(__dirname, "../invoices");
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
fs.writeFileSync(path.join(invoicesDir, `facture_${factureId}.html`), html, "utf8");
const factureUrl = `/invoices/facture_${factureId}.html`;
    return res.json({
      success: true,
      message: (await isTestMode()) ? "[TEST] Abonnement simule avec succes" : "Abonnement effectue avec succes",
      test_mode: await isTestMode(),
      reference: apiResponse.data?.reference,
      facture_url: factureUrl,
      commission: commissionTotale,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur", details: error.message });
  } finally {
    if (connection) connection.release();
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

const express = require("express");
const auth = require("../middleware/auth");
const pool = require("../db");
const { askAssistant, getAiStatus } = require("../utils/aiAssistant");
const axios = require("axios");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/ai/assist", auth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "partner" && role !== "admin") {
      return res.status(403).json({ error: "Accès réservé aux partenaires et administrateurs" });
    }

    const { message, history } = req.body || {};
    
    // Fetch context
    let context = "";
    if (role === "partner") {
      const userId = req.user.id;
      const [users] = await pool.query("SELECT name, prenom, structure, wallet_balance, commission_balance FROM users WHERE id = ?", [userId]);
      const user = users[0];
      
      const [decoders] = await pool.query("SELECT numero, status FROM decodeurs WHERE partner_id = ?", [userId]);
      
      const [recharges] = await pool.query("SELECT montant, statut, created_at, moyen_paiement FROM demandes_recharge WHERE user_id = ? ORDER BY id DESC LIMIT 5", [userId]);
      const [reabonnements] = await pool.query("SELECT numero_abonne, formule, montant, created_at FROM reabonnements WHERE users_id = ? ORDER BY id DESC LIMIT 5", [userId]);
      
      context = `
INFORMATIONS PARTENAIRE EN TEMPS RÉEL (CONTEXTE) :
- Nom : ${user?.prenom || ""} ${user?.name || ""}
- Structure : ${user?.structure || "Aucune"}
- Solde Portefeuille actuel : ${Number(user?.wallet_balance || 0).toLocaleString()} FCFA
- Commissions cumulées actuelles : ${Number(user?.commission_balance || 0).toLocaleString()} FCFA

DÉCODEURS DU PARTENAIRE :
${decoders.length === 0 ? "- Aucun décodeur attribué" : decoders.map(d => `- N° ${d.numero} (Statut: ${d.status === 'free' ? 'Libre/Disponible' : 'Utilisé/Actif'})`).join('\n')}

DERNIÈRES DEMANDES DE RECHARGE :
${recharges.length === 0 ? "- Aucune recharge récente" : recharges.map(r => `- Montant: ${Number(r.montant).toLocaleString()} FCFA, Moyen: ${r.moyen_paiement || 'N/A'}, Statut: ${r.statut}, Date: ${new Date(r.created_at).toLocaleDateString("fr-FR")}`).join('\n')}

DERNIERS RÉABONNEMENTS / UPGRADES INITIÉS :
${reabonnements.length === 0 ? "- Aucun réabonnement récent" : reabonnements.map(r => `- Abonné: ${r.numero_abonne}, Formule: ${r.formule}, Montant: ${Number(r.montant).toLocaleString()} FCFA, Date: ${new Date(r.created_at).toLocaleDateString("fr-FR")}`).join('\n')}
`;
    } else if (role === "admin") {
      const [usersCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'partner'");
      const [pendingUsers] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'partner' AND status = 'pending'");
      const [pendingRecharges] = await pool.query("SELECT COUNT(*) as count FROM demandes_recharge WHERE statut = 'en_attente'");
      
      // Statistiques supplémentaires pour l'administrateur
      const [bestPartners] = await pool.query(
        `SELECT name, prenom, structure, COALESCE(commission_total, 0) as commissions 
         FROM users WHERE role='partner' ORDER BY commission_total DESC LIMIT 5`
      );
      const [commissionsSum] = await pool.query(
        `SELECT COALESCE(SUM(commission_total), 0) as total FROM users WHERE role='partner'`
      );
      const [decodersCount] = await pool.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM decodeurs`
      );
      const [recentSales] = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(montant), 0) as total 
         FROM reabonnements WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );

      context = `
INFORMATIONS ADMIN EN TEMPS RÉEL (CONTEXTE) :
- Nombre de partenaires : ${usersCount[0]?.count || 0}
- Partenaires en attente de validation : ${pendingUsers[0]?.count || 0}
- Demandes de recharge en attente de validation : ${pendingRecharges[0]?.count || 0}

STATISTIQUES DE VENTE & PORTEFEUILLE GLOBALES :
- Total des commissions distribuées aux partenaires : ${Number(commissionsSum[0]?.total || 0).toLocaleString()} FCFA
- Réabonnements sur les 7 derniers jours : ${recentSales[0]?.count || 0} opérations, pour un montant de ${Number(recentSales[0]?.total || 0).toLocaleString()} FCFA
- Décodeurs dans le système : ${decodersCount[0]?.total || 0} décodeurs enregistrés (dont ${decodersCount[0]?.active || 0} actifs)

MEILLEURS REVENDEDURS (TOP 5 PARTENAIRES PAR COMMISSIONS CUMULÉES) :
${bestPartners.length === 0 ? "- Aucun partenaire" : bestPartners.map((p, idx) => `${idx + 1}. ${p.prenom} ${p.name} (${p.structure || 'Sans structure'}) : ${Number(p.commissions).toLocaleString()} FCFA de commissions`).join('\n')}
`;
    }

    const result = await askAssistant(message, history, req.user.id, context);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Erreur assistant IA",
    });
  }
});

router.post("/ai/transcribe", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier audio reçu" });
    }
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(400).json({ error: "La transcription vocale nécessite une clé GROQ_API_KEY." });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("language", "fr");

    const response = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", formData, {
      headers: {
        "Authorization": `Bearer ${groqKey}`,
      }
    });

    const text = response.data?.text || "";
    return res.json({ text });
  } catch (err) {
    console.error("🔥 Transcription error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Erreur lors de la transcription audio." });
  }
});

router.get("/ai/status", auth, async (req, res) => {
  return res.json(getAiStatus());
});

module.exports = router;

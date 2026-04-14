const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const router = express.Router();

router.post("/search", async (req, res) => {
  const { numero, numabo, numdecabo, telephone, email } = req.body;

  console.log("=== SEARCH REQUEST ===");
  console.log("Body reçu:", req.body);

  // Au moins un critère doit être fourni
  if (!numero && !numabo && !numdecabo && !telephone && !email) {
    return res.status(400).json({ 
      error: "Veuillez fournir au moins un critère de recherche" 
    });
  }

  // Fonction pour formater les numéros camerounais
  const formatCameroonPhone = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");

    // Si le numéro est déjà au format 00237xxxxxxxxx
    if (clean.startsWith("00237") && clean.length === 14) {
      return clean;
    }

    // Si le numéro est au format 237xxxxxxxxx
    if (clean.startsWith("237") && clean.length === 12) {
      return `00${clean}`;
    }

    // Si le numéro est au format local 9 chiffres
    if (clean.length === 9) {
      return `00237${clean}`;
    }

    return "";
  };

  try {
    // Construire le payload pour Fujisat (toujours envoyer les 4 champs)
    const fujiPayload = {
      numabo: numabo ? numabo.trim() : "",
      numdecabo: numdecabo ? numdecabo.trim() : "",
      emailabo: email ? email.trim() : "",
      telabo: telephone ? formatCameroonPhone(telephone) : ""
    };

    console.log("Payload Fujisat envoyé:", fujiPayload);

    const response = await axios.post(
      `${process.env.FUJISAT_URL}/public-api/abonne/search`,
      fujiPayload,
      {
        auth: {
          username: process.env.FUJISAT_USER,
          password: process.env.FUJISAT_PASS
        },
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("Réponse Fujisat reçue:", response.status);
    const data = response.data;

    if (!Array.isArray(data?.data) || data.data.length === 0) {
      console.log("Aucun abonné trouvé");
      return res.status(404).json({ error: "Abonné introuvable" });
    }

    const parseDate = (dateString) => {
      if (!dateString || typeof dateString !== "string") return null;
      const parts = dateString.split("/").map((part) => Number(part));
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
      const [day, month, year] = parts;
      return new Date(year, month - 1, day);
    };

    const formatAbonne = (abonneRaw) => {
      const debaboDate = parseDate(abonneRaw.debabo);
      const finaboDate = parseDate(abonneRaw.finabo);
      const now = new Date();

      let status = "inconnu";
      if (abonneRaw.annuleabo && String(abonneRaw.annuleabo).trim() !== "" && String(abonneRaw.annuleabo).toLowerCase() !== "null") {
        status = "annulé";
      } else if (finaboDate && finaboDate < now) {
        status = "expiré";
      } else if (debaboDate && debaboDate > now) {
        status = "à venir";
      } else {
        status = "actif";
      }

      return {
        numdecabo: abonneRaw.clabo || "",
        numabo: abonneRaw.numabo || "",
        nom: abonneRaw.nomabo || "",
        prenom: abonneRaw.prenomabo || "",
        name: `${abonneRaw.prenomabo || ""} ${abonneRaw.nomabo || ""}`.trim(),
        telephone: abonneRaw.telepohoneabo
                || abonneRaw.telephoneAbonne
                || abonneRaw.telabo
                || abonneRaw.telephoneabo
                || abonneRaw.telephone1
                || abonneRaw.telephone2
                || "",
        address: [
          abonneRaw.adresseabo || "",
          abonneRaw.villabo || "",
          abonneRaw.paysabo || ""
        ].filter(Boolean).join(", "),
        email: abonneRaw.emailabo || "",
        status,
        rawStatus: abonneRaw.annuleabo || null,
        bouquet: abonneRaw.optionmajeureabo || "",
        previousFormule: abonneRaw.optionmajeureabo || "",
        debutAbonnement: abonneRaw.debabo || null,
        finAbonnement: abonneRaw.finabo || null,
        numeroContrat: abonneRaw.numeroContrat || abonneRaw.cabo || null,
      };
    };

    const abonnes = data.data.map(formatAbonne);
    console.log("Abonnés formatés et retournés", abonnes.length);
    res.json({ abonnes, abonne: abonnes[0] });

  } catch (err) {
    console.error("❌ Erreur Fujisat:");
    console.error("Status:", err.response?.status);
    console.error("Data:", err.response?.data);
    console.error("Message:", err.message);
    
    res.status(err.response?.status || 500).json({ 
      error: err.response?.data?.message || "Erreur lors de la recherche auprès de Fujisat" 
    });
  }
});

module.exports = router;


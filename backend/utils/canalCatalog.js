const CANAL_CATALOG = {
  offres: [
    { name: "Access", price: 5000, desc: "Accès de base, chaînes locales et généralistes" },
    { name: "Evasion", price: 10500, desc: "Plus de divertissement, cinéma et sport" },
    { name: "Access+", price: 15000, desc: "Cinéma premium et grandes compétitions sportives" },
    { name: "Tout Canal+", price: 28000, desc: "L'expérience ultime avec toutes les chaînes et options" }
  ],
  options: [
    { name: "ENGLISH PLUS DD", price: 5000, desc: "Chaînes supplémentaires en anglais" },
    { name: "CHARME", price: 7000, desc: "Chaînes adultes premium" }
  ],
  accessoires: [
    { name: "LNB (Tête parabole)", price: 4000 },
    { name: "Chargeur décodeur", price: 3000 },
    { name: "Câble coaxial", price: 5000 },
    { name: "Kit complet (Décodeur + Parabole + Câble)", price: 15000 },
    { name: "Câble HDMI", price: 2000 },
    { name: "Télécommande", price: 3000 }
  ],
  erreurs: [
    {
      code: "E16",
      cause: "Droits expirés ou décodeur resté éteint trop longtemps après réabonnement.",
      solution: "Le partenaire peut lancer un rafraîchissement d'image/droits depuis son écran de réabonnement sur l'application, ou vous pouvez demander à l'administrateur de rafraîchir les droits du décodeur."
    },
    {
      code: "E30",
      cause: "Problème de lecture de la carte à puce.",
      solution: "Retirez la carte à puce du décodeur, nettoyez délicatement la puce dorée avec un chiffon doux et sec, puis réinsérez la carte dans le décodeur, puce vers le bas."
    },
    {
      code: "E06",
      cause: "Carte à puce absente ou mal introduite.",
      solution: "Vérifiez que la carte à puce officielle Canal+ est insérée dans la bonne fente du décodeur, dans le bon sens (généralement la puce vers le bas)."
    },
    {
      code: "E18",
      cause: "Décodeur bloqué ou en cours de mise à jour des droits.",
      solution: "Éteignez le décodeur électriquement, patientez 30 secondes, rebranchez-le, puis laissez-le allumé sur la chaîne 1 (Canal+) pendant environ 15 à 30 minutes sans changer de chaîne."
    }
  ]
};

function getCatalogPromptContext() {
  let ctx = "CATALOGUE CANAL+ CAMEROUN & GUIDE DE DÉPANNAGE :\n\n";
  
  ctx += "--- OFFRES ET BOUQUETS ---\n";
  CANAL_CATALOG.offres.forEach(o => {
    ctx += `- ${o.name} : ${o.price.toLocaleString()} FCFA (${o.desc})\n`;
  });
  
  ctx += "\n--- OPTIONS COMPLÉMENTAIRES (UPGRADES) ---\n";
  CANAL_CATALOG.options.forEach(opt => {
    ctx += `- ${opt.name} : ${opt.price.toLocaleString()} FCFA (${opt.desc})\n`;
  });
  
  ctx += "\n--- ACCESSOIRES ET TARIFS ---\n";
  CANAL_CATALOG.accessoires.forEach(a => {
    ctx += `- ${a.name} : ${a.price.toLocaleString()} FCFA\n`;
  });
  
  ctx += "\n--- GUIDE DE DÉPANNAGE (CODES D'ERREUR) ---\n";
  CANAL_CATALOG.erreurs.forEach(e => {
    ctx += `Code ${e.code} : ${e.cause}\n   👉 Solution : ${e.solution}\n`;
  });
  
  return ctx;
}

module.exports = { CANAL_CATALOG, getCatalogPromptContext };

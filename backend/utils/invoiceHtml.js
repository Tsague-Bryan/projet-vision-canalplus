const fixInvoiceFrench = (text) =>
  text
    .replace(/RÃ‰ABONNEMENT/gi, "RÉABONNEMENT")
    .replace(/R\uFFFD0ABONNEMENT/gi, "RÉABONNEMENT")
    .replace(/R\uFFFDABONNEMENT/gi, "RÉABONNEMENT")
    .replace(/R0ABONNEMENT/g, "RÉABONNEMENT")
    .replace(/DÃ‰SIGNATION/gi, "DÉSIGNATION")
    .replace(/D\uFFFDSIGNATION/gi, "DÉSIGNATION")
    .replace(/D0SIGNATION/g, "DÉSIGNATION")
    .replace(/GÃ‰NÃ‰RÃ‰/gi, "GÉNÉRÉ")
    .replace(/G\uFFFDN\uFFFDR\uFFFD/gi, "GÉNÉRÉ")
    .replace(/G0N0R0/g, "GÉNÉRÉ")
    .replace(/Facture N\uFFFD/g, "Facture N°")
    .replace(/NÂ°/g, "N°")
    .replace(/N\uFFFD(\d)/g, "N° $1")
    .replace(/N\uFFFD /g, "N° ")
    .replace(/N\uFFFD abonn\uFFFD/g, "N° abonné")
    .replace(/N° abonn\uFFFD/g, "N° abonné")
    .replace(/Montants pay\uFFFDs/g, "Montants payés")
    .replace(/D\uFFFD0SIGNATION/gi, "DÉSIGNATION")
    .replace(/D[^\wÉ]0SIGNATION/gi, "DÉSIGNATION")
    .replace(/pr\uFFFDsente facture \uFFFD la/g, "présente facture à la")
    .replace(/facture \uFFFD la/g, "facture à la")
    .replace(/r\uFFFDclamation/g, "réclamation")
    .replace(/Pri\uFFFDre/g, "Prière")
    .replace(/pr\uFFFDcieusement/g, "précieusement")
    .replace(/re\uFFFDu/g, "reçu")
    .replace(/demand\uFFFD/g, "demandé")
    .replace(/G\uFFFD0N\uFFFD R\uFFFD0/gi, "GÉNÉRÉ")
    .replace(/G0N° 0R\uFFFD0/gi, "GÉNÉRÉ")
    .replace(/DOCUMENT G[^\w]*N[^\w]*R[^\w]* EN MODE TEST/gi, "⚠ DOCUMENT GÉNÉRÉ EN MODE TEST")
    .replace(/\uFFFDa\uFFFD DOCUMENT G[^\n]+MODE TEST — NON VALABLE/g, "⚠ DOCUMENT GÉNÉRÉ EN MODE TEST — NON VALABLE")
    .replace(/l'abonn\uFFFD/g, "l'abonné")
    .replace(/Mat\uFFFDriel/g, "Matériel")
    .replace(/D\uFFFDcodeur/g, "Décodeur")
    .replace(/op\uFFFDration/g, "opération")
    .replace(/Dur\uFFFDe/g, "Durée")
    .replace(/r\uFFFDglement/g, "règlement")
    .replace(/num\uFFFDrique/g, "numérique")
    .replace(/d\uFFFDbut/g, "début")
    .replace(/Grossiste agr\uFFFD\uFFFD/g, "Grossiste agréé")
    .replace(/Grossiste agr\uFFFD/g, "Grossiste agréé")
    .replace(/R\uFFFDf/g, "Réf")
    .replace(/effectu\uFFFDe/g, "effectuée")
    .replace(/r\uFFFDelle/g, "réelle")
    .replace(/pr\uFFFDsente/g, "présente")
    .replace(/Arr\uFFFDt\uFFFD/g, "Arrêté")
    .replace(/\uFFFD—/g, "—")
    .replace(/—\uFFFD/g, "—")
    .replace(/\uFFFDa\uFFFD DOCUMENT TEST \uFFFD—/g, "⚠ DOCUMENT TEST —")
    .replace(/â€"/g, "—")
    .replace(/âš\s/g, "⚠ ")
    .replace(/âš\s*ï¸\s*/g, "⚠ ")
    .replace(/a DOCUMENT TEST/g, "⚠ DOCUMENT TEST")
    .replace(/a TEST/g, "⚠ TEST")
    .replace(/\u001d/g, "—")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

const repairInvoiceHtml = (html = "") => {
  let output = String(html || "");
  if (/[ÃÂâ]/.test(output)) {
    for (let i = 0; i < 4 && /[ÃÂâ]/.test(output); i += 1) {
      output = Buffer.from(output, "latin1").toString("utf8");
    }
  }
  output = fixInvoiceFrench(output);
  return output;
};

const repairInvoiceFile = (filePath, fs) => {
  const html = fs.readFileSync(filePath, "utf8");
  const fixed = repairInvoiceHtml(html);
  if (fixed !== html) {
    fs.writeFileSync(filePath, fixed, "utf8");
    return true;
  }
  return false;
};

module.exports = { repairInvoiceHtml, repairInvoiceFile };

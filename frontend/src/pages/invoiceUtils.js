import jsPDF from "jspdf";
import "jspdf-autotable"; // ⚠️ important : active doc.autoTable

const STORAGE_KEY = "canal_transactions";

// ── LOCAL STORAGE ───────────────────────────────────────────────
export function saveTransaction(invoiceData) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.unshift(invoiceData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getLocalTransactions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

// ── TROUVER FACTURE LOCALE ──────────────────────────────────────
export function findLocalInvoice(apiTransaction) {
  const local = getLocalTransactions();
  return local.find((lt) => {
    const sameAbonne = lt.abonne?.numabo === String(apiTransaction.numero_abonne);
    if (!sameAbonne) return false;

    if (!apiTransaction.created_at) return sameAbonne;

    const apiDate = new Date(apiTransaction.created_at).getTime();
    const [day, month, year] = (lt.date || "").split("/");
    if (!day || !month || !year) return sameAbonne;

    const localDate = new Date(`${year}-${month}-${day}`).getTime();
    return Math.abs(apiDate - localDate) < 86400000 * 2; // ±2 jours
  });
}

// ── CONSTRUIRE FACTURE ─────────────────────────────────────────
export function buildInvoiceFromApiTransaction(t) {
  const d = t?.created_at ? new Date(t.created_at) : new Date();

  return {
    reference: t?.reference || `REF-${t?.id || Date.now()}`,
    date: d.toLocaleDateString("fr-FR"),
    heure: d.toLocaleTimeString("fr-FR"),
    typeOperation: t?.type_operation || "Réabonnement",
    partenaireId: localStorage.getItem("userId") || "-",
    partenaireName: localStorage.getItem("userName") || "Partenaire",
    montant: t?.montant || 0,
    abonne: {
      nom: t?.nom_abonne || "-",
      numabo: String(t?.numero_abonne || "-"),
      numdecabo: t?.numdecabo || "-",
      telephone: t?.telephone || "-",
      email: t?.email || "-",
      adresse: t?.adresse || "-",
      formuleActuelle: t?.formule_precedente || "-",
      debutAbonnement: t?.debut_abonnement || "-",
      finAbonnement: t?.fin_abonnement || "-",
      numeroContrat: String(t?.numero_contrat || "-"),
    },
    operation: {
      type: t?.type_operation || "Réabonnement",
      formule: t?.formule || "-",
      options: Array.isArray(t?.options) ? t.options : [],
      montant: t?.montant || 0,
      formuleActuelle: t?.formule_precedente || "-",
      duree: t?.duree || null,
    },
  };
}

// ── GENERER PDF ─────────────────────────────────────────────────
function buildPDF(doc, data, margin = 15, pageW = 210) {
  // Entête
  doc.setFillColor(0, 51, 160);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CANAL+ CAMEROUN", margin, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Facture de transaction partenaire", margin, 20);
  doc.text(`Réf. : ${data.reference || "-"}`, margin, 26);
  doc.text(
    `Date : ${data.date || "-"}  |  Heure : ${data.heure || "-"}`,
    pageW - margin,
    13,
    { align: "right" }
  );
  doc.text(`Partenaire : ${data.partenaireName || "-"}`, pageW - margin, 20, { align: "right" });
  doc.text(`ID : ${data.partenaireId || "-"}`, pageW - margin, 26, { align: "right" });

  let y = 42;

  // Informations abonné
  doc.setTextColor(0, 51, 160);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS DE L'ABONNÉ", margin, y);
  y += 2;
  doc.setDrawColor(0, 51, 160);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const abonBody = [
    ["Nom complet", data.abonne?.nom || "-", "Nº abonné", data.abonne?.numabo || "-"],
    ["Nº décodeur", data.abonne?.numdecabo || "-", "Téléphone", data.abonne?.telephone || "-"],
    ["Email", data.abonne?.email || "-", "Adresse", data.abonne?.adresse || "-"],
    ["Nº de contrat", data.abonne?.numeroContrat || "-", "Formule actuelle", data.abonne?.formuleActuelle || "-"],
    ["Début abonn.", data.abonne?.debutAbonnement || "-", "Fin abonn.", data.abonne?.finAbonnement || "-"],
  ];

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2, textColor: [30, 30, 30] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 55, textColor: [60, 60, 60] },
      1: { cellWidth: 75 },
      2: { fontStyle: "bold", cellWidth: 20, textColor: [60, 60, 60] },
      3: { cellWidth: 35 },
    },
    body: abonBody,
  });

  y = doc.lastAutoTable?.finalY + 10 || y + 50;

  // Détails opération
  doc.setTextColor(0, 51, 160);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DE L'OPÉRATION", margin, y);
  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const options = Array.isArray(data.operation?.options) ? data.operation.options : [];
  const opRows = [
    ["Type d'opération", data.operation?.type || data.typeOperation || "-"],
    ["Formule", data.operation?.formule || "-"],
  ];
  if (data.operation?.formuleActuelle) opRows.push(["Formule actuelle", data.operation.formuleActuelle]);
  if (data.operation?.duree != null) opRows.push(["Durée", `${data.operation.duree} mois`]);
  opRows.push(["Options ajoutées", options.length > 0 ? options.join("\n") : "Aucune"]);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    head: [["Champ", "Valeur"]],
    headStyles: { fillColor: [0, 51, 160], textColor: 255, fontSize: 9.5, fontStyle: "bold" },
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 65, fillColor: [240, 244, 255] } },
    body: opRows,
  });

  y = doc.lastAutoTable?.finalY + 8 || y + 50;

  // Montant total
  const montant = data.operation?.montant ?? data.montant ?? 0;
  doc.setFillColor(0, 51, 160);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("MONTANT TOTAL FACTURÉ", margin + 6, y + 7);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${Number(montant).toLocaleString("fr-FR")} FCFA`, pageW - margin - 6, y + 12, { align: "right" });

  y += 28;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 4, pageW - margin, y - 4);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text("Facture générée automatiquement par Canal+ Cameroun.", pageW / 2, y, { align: "center" });
  doc.text(`Référence : ${data.reference} | Généré le ${data.date} à ${data.heure}`, pageW / 2, y + 5, { align: "center" });
}

// ── EXPORTS ─────────────────────────────────────────────────────
export function generateInvoicePDF(data) {
  if (typeof window === "undefined") return; // sécurité SSR
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    buildPDF(doc, data);
    const fileName = `Facture_${data.reference || Date.now()}_${data.abonne?.numabo || "abonne"}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("Erreur génération PDF:", err);
  }
}

export function printInvoicePDF(data) {
  if (typeof window === "undefined") return; // sécurité SSR
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    buildPDF(doc, data);
    const blobUrl = doc.output("bloburl");
    const win = window.open(blobUrl, "_blank");
    if (win) win.focus();
  } catch (err) {
    console.error("Erreur impression PDF:", err);
  }
}
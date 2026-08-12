import PDFDocument from "pdfkit";
import { formatInvoiceNumber } from "./invoice";

export interface InvoicePdfData {
  invoice: {
    sequenceNumber: number;
    issuedAt: Date;
    amount: number; // TTC, centimes
    currency: string;
    vatRate: number | null; // points de base
    status: string;
  };
  orderId: string;
  product: { name: string };
  provider: { name: string };
  buyer: { email: string; name: string | null };
  organization?: { name: string; vatNumber: string | null } | null;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
}

// "À compléter" plutôt qu'une chaîne vide : rend visible, sur le document lui-même,
// que l'identité légale du vendeur n'a pas encore été configurée (COMPANY_* en env)
// — pour ne jamais laisser croire qu'un PDF incomplet est une vraie facture.
function companyField(value: string | undefined, label: string) {
  return value && value.trim() ? value : `${label} — à compléter`;
}

export function generateInvoicePdf(data: InvoicePdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const { invoice, product, provider, buyer, organization } = data;
  const number = formatInvoiceNumber(invoice.issuedAt, invoice.sequenceNumber);

  // Vendeur
  doc.fontSize(10).fillColor("#52514e");
  doc.text(companyField(process.env.COMPANY_NAME, "Raison sociale"), 50, 50);
  doc.text(companyField(process.env.COMPANY_ADDRESS, "Adresse"));
  doc.text(`SIRET : ${companyField(process.env.COMPANY_REGISTRATION_NUMBER, "n° d'immatriculation")}`);
  doc.text(`TVA intracommunautaire : ${companyField(process.env.COMPANY_VAT_NUMBER, "n° TVA")}`);

  // Titre + numéro
  doc.fontSize(20).fillColor("#0b0b0b").text("Facture", 350, 50, { align: "right" });
  doc.fontSize(10).fillColor("#52514e");
  doc.text(`N° ${number}`, 350, 78, { align: "right" });
  doc.text(`Émise le ${invoice.issuedAt.toLocaleDateString("fr-FR")}`, { align: "right" });
  if (invoice.status !== "ISSUED") doc.text(`Statut : ${invoice.status}`, { align: "right" });

  // Facturé à
  doc.moveDown(3);
  const billToY = doc.y;
  doc.fontSize(10).fillColor("#898781").text("Facturé à", 50, billToY);
  doc.fillColor("#0b0b0b").fontSize(11);
  if (organization) {
    doc.text(organization.name);
    if (organization.vatNumber) doc.fontSize(10).fillColor("#52514e").text(`TVA : ${organization.vatNumber}`);
  } else {
    doc.text(buyer.name || buyer.email);
  }
  doc.fontSize(10).fillColor("#52514e").text(buyer.email);

  // Tableau des lignes
  const tableTop = doc.y + 30;
  doc.fontSize(10).fillColor("#898781");
  doc.text("Description", 50, tableTop);
  doc.text("Fournisseur", 260, tableTop);
  doc.text("Qté", 400, tableTop, { width: 40, align: "right" });
  doc.text("Total", 460, tableTop, { width: 90, align: "right" });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor("#e1e0d9").stroke();

  const rowY = tableTop + 25;
  doc.fillColor("#0b0b0b").fontSize(11);
  doc.text(product.name, 50, rowY, { width: 200 });
  doc.fontSize(10).fillColor("#52514e").text(provider.name, 260, rowY, { width: 130 });
  doc.text("1", 400, rowY, { width: 40, align: "right" });
  doc.fillColor("#0b0b0b").text(money(invoice.amount, invoice.currency), 460, rowY, { width: 90, align: "right" });

  // Totaux
  let totalsY = rowY + 40;
  doc.moveTo(350, totalsY).lineTo(550, totalsY).strokeColor("#e1e0d9").stroke();
  totalsY += 10;
  doc.fontSize(10).fillColor("#52514e");

  if (invoice.vatRate !== null) {
    const ht = Math.round(invoice.amount / (1 + invoice.vatRate / 10000));
    const vat = invoice.amount - ht;
    doc.text("Montant HT", 350, totalsY, { width: 110 });
    doc.text(money(ht, invoice.currency), 460, totalsY, { width: 90, align: "right" });
    totalsY += 16;
    doc.text(`TVA (${(invoice.vatRate / 100).toFixed(2)} %)`, 350, totalsY, { width: 110 });
    doc.text(money(vat, invoice.currency), 460, totalsY, { width: 90, align: "right" });
    totalsY += 16;
  } else {
    doc.text("TVA non applicable", 350, totalsY, { width: 200 });
    totalsY += 16;
  }

  doc.fontSize(12).fillColor("#0b0b0b");
  doc.text("Total TTC", 350, totalsY, { width: 110 });
  doc.text(money(invoice.amount, invoice.currency), 460, totalsY, { width: 90, align: "right" });

  // Pied de page
  doc.fontSize(8).fillColor("#898781");
  doc.text(`Commande ${data.orderId}`, 50, 750, { width: 500 });
  doc.text("Facture générée automatiquement.", 50, 762, { width: 500 });

  doc.end();
  return doc;
}

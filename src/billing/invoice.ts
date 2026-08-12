// Numéro légal séquentiel : formaté à la lecture depuis Invoice.sequenceNumber
// (attribué par Postgres à la création, jamais recalculé ici).
export function formatInvoiceNumber(issuedAt: Date, sequenceNumber: number): string {
  return `FA-${issuedAt.getFullYear()}-${String(sequenceNumber).padStart(6, "0")}`;
}

// Taux de TVA configuré pour la plateforme (points de base, ex. 2000 = 20 %).
// Retourne null si DEFAULT_VAT_RATE n'est pas défini — on n'invente jamais un
// taux par défaut sur une donnée fiscale.
export function getConfiguredVatRate(): number | null {
  const raw = process.env.DEFAULT_VAT_RATE;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

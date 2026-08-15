import { Order } from "./api";

// Vocabulaire client unifié (spec DigiGo section 18) : jamais l'état technique
// brut, toujours une formulation simple côté front-office — client comme admin.
export const ORDER_STATUS_LABEL: Record<Order["status"], string> = {
  PENDING: "Traitement par le partenaire",
  CONFIRMED: "Réussie",
  FAILED: "Échec",
  REFUNDED: "Remboursée",
  EXPIRED: "Échec (expirée)",
};

export const ORDER_STATUS_BADGE_CLASS: Record<Order["status"], string> = {
  PENDING: "bg-stone-100 text-stone-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  FAILED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100",
  REFUNDED: "bg-stone-100 text-stone-700",
  EXPIRED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100",
};

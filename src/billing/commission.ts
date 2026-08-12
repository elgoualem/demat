import { CommissionType } from "@prisma/client";

interface CommissionRule {
  commissionType: CommissionType;
  commissionValue: number;
}

// Commission plateforme, calculée sur le montant payé par le client (jamais
// visible par lui — voir routes/orders.ts et routes/organizations.ts qui
// l'excluent explicitement de toute réponse accessible aux clients).
// PERCENTAGE : commissionValue en points de base (500 = 5,00 %).
// FIXED : commissionValue en centimes, plafonné au montant de la commande.
export function calculatePlatformFee(provider: CommissionRule, amount: number): number {
  if (provider.commissionType === "FIXED") {
    return Math.min(provider.commissionValue, amount);
  }
  return Math.round((amount * provider.commissionValue) / 10000);
}

import { prisma } from "../db";
import { getConnector } from "../connectors/registry";
import { CreateOrderRequest } from "../connectors/types";
import { getConfiguredVatRate } from "../billing/invoice";

// Couche d'orchestration : route vers le bon connecteur, applique retries + idempotency key,
// journalise chaque tentative dans Event pour garder une traçabilité de bout en bout
// quel que soit le parcours (natif ici ; hybride/externe suivront le même principe
// avec une étape de redirection en plus, cf. prompt 2).

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 300;

export async function submitOrderToProvider(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { provider: true, product: true },
  });

  const connector = getConnector(order.provider);

  const req: CreateOrderRequest = {
    serviceExternalId: order.product.slug,
    idempotencyKey: order.idempotencyKey, // même clé à chaque retry -> pas de double création côté fournisseur
    amount: order.amount,
    currency: order.currency,
  };

  let lastResult;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await prisma.event.create({
      data: { orderId, type: "PROVIDER_CALL_ATTEMPT", payload: { attempt } },
    });

    lastResult = await connector.createOrder(req);

    if (lastResult.success) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          providerOrderId: lastResult.providerOrderId,
          confirmedAt: new Date(),
        },
      });
      await prisma.event.create({
        data: { orderId, type: "PROVIDER_CONFIRMED", payload: { attempt, providerOrderId: lastResult.providerOrderId } },
      });
      await prisma.invoice.create({
        data: { orderId, amount: order.amount, currency: order.currency, vatRate: getConfiguredVatRate() },
      });
      return { status: "CONFIRMED" as const };
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt));
    }
  }

  // Échec après tous les retries : commande en échec, remboursement implicite
  // (pas de facture émise), fournisseur marqué dégradé pour alerter le monitoring.
  await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  await prisma.event.create({
    data: { orderId, type: "PROVIDER_FAILED", payload: { reason: lastResult?.reason ?? "unknown" } },
  });
  await prisma.provider.update({ where: { id: order.providerId }, data: { status: "DEGRADED" } });

  return { status: "FAILED" as const, reason: lastResult?.reason };
}

import { prisma } from "../db";
import { submitOrderToProvider } from "./orchestrator";
import { calculatePlatformFee } from "../billing/commission";
import { v4 as uuidv4 } from "uuid";

// Séquence de création d'une commande à partir d'une offre choisie, factorisée
// pour être appelée aussi bien par l'achat immédiat (POST /orders, 1 offre) que
// par le checkout panier (POST /cart/checkout, N offres potentiellement de
// fournisseurs différents) — même logique, même garanties, une seule fois.

const OMIT_PLATFORM_FEE = { platformFee: true } as const;
// Même sélection que GET /orders (routes/orders.ts) : le nom du produit et du
// fournisseur sont nécessaires à l'affichage (ex. récapitulatif de checkout
// panier), jamais le détail complet du Provider (commission, config API...).
const ORDER_INCLUDE = {
  product: { select: { name: true, slug: true, category: true } },
  provider: { select: { name: true, slug: true } },
} as const;

export class OfferUnavailableError extends Error {
  constructor() {
    super("offer_not_found");
  }
}

export async function createOrderForOffer(params: {
  userId: string;
  organizationId?: string | null;
  offerId: string;
  quantity?: number;
}) {
  const quantity = params.quantity ?? 1;

  const offer = await prisma.offer.findUnique({
    where: { id: params.offerId },
    include: { product: true, provider: true },
  });
  if (!offer || !offer.isActive || !offer.product.isActive) throw new OfferUnavailableError();

  const amount = offer.price * quantity;

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId || null,
      productId: offer.productId,
      offerId: offer.id,
      providerId: offer.providerId,
      amount,
      quantity,
      platformFee: calculatePlatformFee(offer.provider, amount),
      currency: offer.product.currency,
      journeyType: offer.product.journeyType,
      idempotencyKey: uuidv4(),
    },
    include: ORDER_INCLUDE,
    omit: OMIT_PLATFORM_FEE,
  });

  await prisma.event.create({ data: { orderId: order.id, type: "ORDER_CREATED" } });

  if (offer.product.journeyType === "NATIVE") {
    await submitOrderToProvider(order.id);
    return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE, omit: OMIT_PLATFORM_FEE });
  }

  // HYBRID / EXTERNAL : la commande reste PENDING, à compléter par le flux
  // de redirection décrit dans le prompt 2 (hors scope de ce scaffold MVP).
  return order;
}

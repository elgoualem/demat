import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { createOrderForOffer, OfferUnavailableError } from "../orchestrator/createOrder";

const router = Router();
router.use(requireAuth);

const CART_ITEM_INCLUDE = {
  offer: {
    include: {
      product: true,
      provider: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithOffer = Prisma.CartItemGetPayload<{ include: typeof CART_ITEM_INCLUDE }>;

// L'offre (ou son produit) a pu être désactivée entre l'ajout au panier et
// maintenant — jamais recalculé en silence, signalé au client (voir GET /cart
// et POST /cart/checkout) plutôt que de facturer un prix qui n'est plus valable.
function serializeCartItem(item: CartItemWithOffer) {
  const available = item.offer.isActive && item.offer.product.isActive;
  return {
    id: item.id,
    quantity: item.quantity,
    available,
    subtotal: available ? item.offer.price * item.quantity : 0,
    offer: { id: item.offer.id, price: item.offer.price, provider: item.offer.provider },
    product: {
      id: item.offer.product.id,
      name: item.offer.product.name,
      slug: item.offer.product.slug,
      imageUrl: item.offer.product.imageUrl,
      currency: item.offer.product.currency,
      journeyType: item.offer.product.journeyType,
    },
  };
}

// GET /cart — contenu du panier de l'utilisateur connecté.
router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId! },
    include: CART_ITEM_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  const serialized = items.map(serializeCartItem);
  res.json({ items: serialized, total: serialized.reduce((sum, i) => sum + i.subtotal, 0) });
}));

// POST /cart { offerId, quantity? } — ajoute une offre au panier ; un ajout
// répété de la même offre incrémente la quantité plutôt que de dupliquer une ligne.
router.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { offerId } = req.body;
  const quantity = Number(req.body.quantity ?? 1);
  if (!offerId) return res.status(400).json({ error: "offerId_required" });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "invalid_quantity" });

  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
  if (!offer || !offer.isActive || !offer.product.isActive) return res.status(404).json({ error: "offer_not_found" });

  const item = await prisma.cartItem.upsert({
    where: { userId_offerId: { userId: req.userId!, offerId } },
    update: { quantity: { increment: quantity } },
    create: { userId: req.userId!, offerId, quantity },
    include: CART_ITEM_INCLUDE,
  });
  res.status(201).json(serializeCartItem(item));
}));

// PATCH /cart/:id { quantity } — modifie la quantité d'une ligne du panier de l'utilisateur.
router.patch("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "invalid_quantity" });

  const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: "cart_item_not_found" });

  const item = await prisma.cartItem.update({
    where: { id: req.params.id },
    data: { quantity },
    include: CART_ITEM_INCLUDE,
  });
  res.json(serializeCartItem(item));
}));

// DELETE /cart/:id — retire une ligne du panier de l'utilisateur.
router.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: "cart_item_not_found" });

  await prisma.cartItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

// POST /cart/checkout { organizationId? } — crée une Order indépendante par ligne
// du panier (fournisseurs différents inclus), vide le panier. Une offre devenue
// indisponible entretemps ne fait pas échouer tout le checkout : elle est
// retirée du panier et signalée dans `skipped`, le reste est commandé normalement.
router.post("/checkout", asyncHandler(async (req: AuthedRequest, res) => {
  const { organizationId } = req.body;

  if (organizationId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.userId!, organizationId } },
    });
    if (!membership) return res.status(403).json({ error: "not_a_member" });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId! },
    include: CART_ITEM_INCLUDE,
  });
  if (items.length === 0) return res.status(400).json({ error: "cart_empty" });

  const orders = [];
  const skipped: { productName: string; reason: string }[] = [];

  for (const item of items) {
    try {
      const order = await createOrderForOffer({
        userId: req.userId!,
        organizationId: organizationId || null,
        offerId: item.offerId,
        quantity: item.quantity,
      });
      orders.push(order);
    } catch (err) {
      if (err instanceof OfferUnavailableError) {
        skipped.push({ productName: item.offer.product.name, reason: "offer_unavailable" });
      } else {
        throw err;
      }
    }
  }

  await prisma.cartItem.deleteMany({ where: { userId: req.userId! } });

  res.json({ orders, skipped });
}));

export default router;

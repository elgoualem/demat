import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { submitOrderToProvider } from "../orchestrator/orchestrator";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { calculatePlatformFee } from "../billing/commission";
import { formatInvoiceNumber } from "../billing/invoice";
import { generateInvoicePdf } from "../billing/generateInvoicePdf";

const router = Router();

// Toutes les routes de ce fichier sont client-facing : platformFee (la commission
// plateforme) ne doit jamais y apparaître, d'où l'omit systématique.
const OMIT_PLATFORM_FEE = { platformFee: true } as const;

// POST /orders { offerId, organizationId? } — parcours natif : le client a choisi une offre
// (un fournisseur, un prix) sur la page produit ; la plateforme crée la commande au prix figé
// de cette offre, appelle le fournisseur via l'orchestrateur, et renvoie le statut final.
// organizationId rattache la commande à une entreprise (B2B, facturation consolidée) ;
// l'utilisateur doit en être membre.
router.post("/", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { offerId, organizationId } = req.body;
  if (!offerId) return res.status(400).json({ error: "offerId_required" });

  if (organizationId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.userId!, organizationId } },
    });
    if (!membership) return res.status(403).json({ error: "not_a_member" });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { product: true, provider: true },
  });
  if (!offer || !offer.isActive || !offer.product.isActive) return res.status(404).json({ error: "offer_not_found" });

  const order = await prisma.order.create({
    data: {
      userId: req.userId!,
      organizationId: organizationId || null,
      productId: offer.productId,
      offerId: offer.id,
      providerId: offer.providerId,
      amount: offer.price,
      platformFee: calculatePlatformFee(offer.provider, offer.price),
      currency: offer.product.currency,
      journeyType: offer.product.journeyType,
      idempotencyKey: uuidv4(),
    },
    omit: OMIT_PLATFORM_FEE,
  });

  await prisma.event.create({ data: { orderId: order.id, type: "ORDER_CREATED" } });

  if (offer.product.journeyType === "NATIVE") {
    const result = await submitOrderToProvider(order.id);
    const updated = await prisma.order.findUnique({ where: { id: order.id }, omit: OMIT_PLATFORM_FEE });
    return res.status(result.status === "CONFIRMED" ? 201 : 502).json(updated);
  }

  // HYBRID / EXTERNAL : la commande reste PENDING, à compléter par le flux
  // de redirection décrit dans le prompt 2 (hors scope de ce scaffold MVP).
  res.status(202).json(order);
}));

// Vrai si l'utilisateur peut voir cette commande : son auteur, un membre de
// l'organisation pour laquelle elle a été passée, ou un admin plateforme.
async function canAccessOrder(userId: string, order: { userId: string; organizationId: string | null }) {
  if (order.userId === userId) return true;
  if (order.organizationId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: order.organizationId } },
    });
    if (membership) return true;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.isAdmin === true;
}

router.get("/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      invoice: true,
      product: { select: { name: true, slug: true, category: true } },
      provider: { select: { name: true, slug: true } },
    },
    omit: OMIT_PLATFORM_FEE,
  });
  if (!order) return res.status(404).json({ error: "order_not_found" });
  if (!(await canAccessOrder(req.userId!, order))) return res.status(403).json({ error: "forbidden" });

  const response = order.invoice
    ? { ...order, invoice: { ...order.invoice, number: formatInvoiceNumber(order.invoice.issuedAt, order.invoice.sequenceNumber) } }
    : order;
  res.json(response);
}));

// GET /orders/:id/invoice.pdf — même contrôle d'accès que la commande elle-même.
router.get("/:id/invoice.pdf", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      invoice: true,
      product: { select: { name: true } },
      provider: { select: { name: true } },
      user: { select: { email: true, name: true } },
      organization: { select: { name: true, vatNumber: true } },
    },
  });
  if (!order || !order.invoice) return res.status(404).json({ error: "invoice_not_found" });
  if (!(await canAccessOrder(req.userId!, order))) return res.status(403).json({ error: "forbidden" });

  const number = formatInvoiceNumber(order.invoice.issuedAt, order.invoice.sequenceNumber);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${number}.pdf"`);

  const doc = generateInvoicePdf({
    invoice: order.invoice,
    orderId: order.id,
    product: order.product,
    provider: order.provider,
    buyer: order.user,
    organization: order.organization,
  });
  doc.pipe(res);
}));

export default router;

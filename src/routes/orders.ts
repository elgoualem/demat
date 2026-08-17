import { Router } from "express";
import { prisma } from "../db";
import { createOrderForOffer, OfferUnavailableError } from "../orchestrator/createOrder";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
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

  let order;
  try {
    order = await createOrderForOffer({ userId: req.userId!, organizationId, offerId });
  } catch (err) {
    if (err instanceof OfferUnavailableError) return res.status(404).json({ error: "offer_not_found" });
    throw err;
  }

  if (order.journeyType === "NATIVE") {
    return res.status(order.status === "CONFIRMED" ? 201 : 502).json(order);
  }

  // HYBRID / EXTERNAL : la commande reste PENDING, à compléter par le flux
  // de redirection décrit dans le prompt 2 (hors scope de ce scaffold MVP).
  res.status(202).json(order);
}));

// GET /orders — espace client : historique complet des commandes personnelles de
// l'utilisateur connecté, tous services confondus, de la plus récente à la plus
// ancienne. Les commandes passées pour le compte d'une organisation restent
// consultables séparément via GET /organizations/:id/orders.
router.get("/", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId! },
    include: {
      product: { select: { name: true, slug: true, category: true } },
      provider: { select: { name: true, slug: true } },
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
    omit: OMIT_PLATFORM_FEE,
  });
  res.json(
    orders.map((o) =>
      o.invoice
        ? { ...o, invoice: { ...o.invoice, number: formatInvoiceNumber(o.invoice.issuedAt, o.invoice.sequenceNumber) } }
        : o
    )
  );
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
  const permission = await prisma.adminPermission.findUnique({
    where: { userId_scope: { userId, scope: "ORDERS" } },
  });
  return !!permission;
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
    quantity: order.quantity,
    product: order.product,
    provider: order.provider,
    buyer: order.user,
    organization: order.organization,
  });
  doc.pipe(res);
}));

export default router;

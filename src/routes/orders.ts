import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { submitOrderToProvider } from "../orchestrator/orchestrator";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// POST /orders { serviceId, organizationId? } — parcours natif : la plateforme crée la commande,
// appelle le fournisseur via l'orchestrateur, et renvoie le statut final.
// organizationId rattache la commande à une entreprise (B2B, facturation consolidée) ;
// l'utilisateur doit en être membre.
router.post("/", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { serviceId, organizationId } = req.body;
  if (!serviceId) return res.status(400).json({ error: "serviceId_required" });

  if (organizationId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.userId!, organizationId } },
    });
    if (!membership) return res.status(403).json({ error: "not_a_member" });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) return res.status(404).json({ error: "service_not_found" });

  const order = await prisma.order.create({
    data: {
      userId: req.userId!,
      organizationId: organizationId || null,
      serviceId: service.id,
      providerId: service.providerId,
      amount: service.price,
      currency: service.currency,
      journeyType: service.journeyType,
      idempotencyKey: uuidv4(),
    },
  });

  await prisma.event.create({ data: { orderId: order.id, type: "ORDER_CREATED" } });

  if (service.journeyType === "NATIVE") {
    const result = await submitOrderToProvider(order.id);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    return res.status(result.status === "CONFIRMED" ? 201 : 502).json(updated);
  }

  // HYBRID / EXTERNAL : la commande reste PENDING, à compléter par le flux
  // de redirection décrit dans le prompt 2 (hors scope de ce scaffold MVP).
  res.status(202).json(order);
}));

router.get("/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { events: { orderBy: { createdAt: "asc" } }, invoice: true },
  });
  if (!order) return res.status(404).json({ error: "order_not_found" });

  const isOwner = order.userId === req.userId;
  const isOrgMember =
    order.organizationId &&
    (await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.userId!, organizationId: order.organizationId } },
    }));
  if (!isOwner && !isOrgMember) return res.status(403).json({ error: "forbidden" });

  res.json(order);
}));

export default router;

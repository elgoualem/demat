import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";
import { submitOrderToProvider } from "../orchestrator/orchestrator";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// POST /orders { serviceId } — parcours natif : la plateforme crée la commande,
// appelle le fournisseur via l'orchestrateur, et renvoie le statut final.
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { serviceId } = req.body;
  if (!serviceId) return res.status(400).json({ error: "serviceId_required" });

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) return res.status(404).json({ error: "service_not_found" });

  const order = await prisma.order.create({
    data: {
      userId: req.userId!,
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
});

router.get("/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { events: { orderBy: { createdAt: "asc" } }, invoice: true },
  });
  if (!order) return res.status(404).json({ error: "order_not_found" });
  res.json(order);
});

export default router;

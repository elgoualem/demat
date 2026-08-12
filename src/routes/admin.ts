import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.isAdmin === true;
}

// GET /admin/commissions — revenus de commission de la plateforme (jamais exposés
// ailleurs : voir routes/orders.ts et routes/organizations.ts qui l'excluent).
// Réservé aux comptes User.isAdmin = true.
router.get("/commissions", asyncHandler(async (req: AuthedRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: "forbidden" });

  const orders = await prisma.order.findMany({
    where: { status: "CONFIRMED" },
    select: {
      id: true,
      amount: true,
      platformFee: true,
      currency: true,
      createdAt: true,
      provider: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byProvider = new Map<string, { providerId: string; providerName: string; totalCommission: number; orderCount: number }>();
  for (const order of orders) {
    const entry = byProvider.get(order.provider.id) ?? {
      providerId: order.provider.id,
      providerName: order.provider.name,
      totalCommission: 0,
      orderCount: 0,
    };
    entry.totalCommission += order.platformFee;
    entry.orderCount += 1;
    byProvider.set(order.provider.id, entry);
  }

  res.json({
    totalCommission: orders.reduce((sum, o) => sum + o.platformFee, 0),
    orderCount: orders.length,
    byProvider: Array.from(byProvider.values()),
    orders,
  });
}));

export default router;

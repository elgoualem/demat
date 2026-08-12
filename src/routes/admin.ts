import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { formatInvoiceNumber } from "../billing/invoice";

const router = Router();

router.use(requireAuth);
router.use(asyncHandler(async (req: AuthedRequest, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.isAdmin) return res.status(403).json({ error: "forbidden" });
  next();
}));

// GET /admin/commissions — revenus de commission de la plateforme (jamais exposés
// ailleurs : voir routes/orders.ts et routes/organizations.ts qui l'excluent).
router.get("/commissions", asyncHandler(async (req, res) => {
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

// GET /admin/analytics?days=30 (ou ?from=YYYY-MM-DD&to=YYYY-MM-DD) — chiffre
// d'affaires (amount) et commission (platformFee) par fournisseur, ventilés
// par jour, pour comparer plusieurs fournisseurs sur une période — + un
// diagnostic agrégé par fournisseur (volume, taux de confirmation, panier
// moyen), tous statuts confondus. from/to prime sur days quand fournis.
router.get("/analytics", asyncHandler(async (req, res) => {
  const parsedFrom = req.query.from ? new Date(String(req.query.from)) : null;
  const parsedTo = req.query.to ? new Date(String(req.query.to)) : null;
  const hasCustomRange = parsedFrom && parsedTo && !isNaN(+parsedFrom) && !isNaN(+parsedTo);

  let since: Date;
  let until: Date;
  if (hasCustomRange) {
    since = new Date(parsedFrom!);
    since.setHours(0, 0, 0, 0);
    until = new Date(parsedTo!);
    until.setHours(23, 59, 59, 999);
    if (until < since) [since, until] = [until, since];
  } else {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    until = new Date();
    until.setHours(23, 59, 59, 999);
  }

  const [providers, orders] = await Promise.all([
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      where: { createdAt: { gte: since, lte: until } },
      select: { providerId: true, status: true, amount: true, platformFee: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Série journalière : uniquement les commandes confirmées comptent comme revenu réel.
  const dailyMap = new Map<string, Map<string, { amount: number; platformFee: number; orderCount: number }>>();
  for (const o of orders) {
    if (o.status !== "CONFIRMED") continue;
    const day = o.createdAt.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, new Map());
    const byProvider = dailyMap.get(day)!;
    const entry = byProvider.get(o.providerId) ?? { amount: 0, platformFee: 0, orderCount: 0 };
    entry.amount += o.amount;
    entry.platformFee += o.platformFee;
    entry.orderCount += 1;
    byProvider.set(o.providerId, entry);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, byProvider]) => ({ date, byProvider: Object.fromEntries(byProvider) }));

  // Diagnostic : tous statuts confondus, pour voir le taux de confirmation par fournisseur.
  const summaryMap = new Map<string, { amount: number; platformFee: number; orderCount: number; confirmedCount: number; failedCount: number }>();
  for (const o of orders) {
    const entry = summaryMap.get(o.providerId) ?? { amount: 0, platformFee: 0, orderCount: 0, confirmedCount: 0, failedCount: 0 };
    entry.orderCount += 1;
    if (o.status === "CONFIRMED") {
      entry.amount += o.amount;
      entry.platformFee += o.platformFee;
      entry.confirmedCount += 1;
    } else if (o.status === "FAILED") {
      entry.failedCount += 1;
    }
    summaryMap.set(o.providerId, entry);
  }

  res.json({
    since: since.toISOString(),
    until: until.toISOString(),
    providers,
    daily,
    summary: providers.map((p) => {
      const s = summaryMap.get(p.id) ?? { amount: 0, platformFee: 0, orderCount: 0, confirmedCount: 0, failedCount: 0 };
      return {
        providerId: p.id,
        providerName: p.name,
        amount: s.amount,
        platformFee: s.platformFee,
        orderCount: s.orderCount,
        confirmedCount: s.confirmedCount,
        failedCount: s.failedCount,
        avgOrderValue: s.confirmedCount > 0 ? Math.round(s.amount / s.confirmedCount) : 0,
        confirmationRate: s.orderCount > 0 ? s.confirmedCount / s.orderCount : null,
      };
    }),
  });
}));

// ---- Fournisseurs ----

router.get("/providers", asyncHandler(async (req, res) => {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { offers: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(providers);
}));

router.post("/providers", asyncHandler(async (req, res) => {
  const { name, slug, connectorKey, commissionType, commissionValue } = req.body;
  if (!name || !slug || !connectorKey) return res.status(400).json({ error: "name_slug_connectorKey_required" });

  const provider = await prisma.provider.create({
    data: {
      name,
      slug,
      connectorKey,
      commissionType: commissionType === "FIXED" ? "FIXED" : "PERCENTAGE",
      commissionValue: Number.isFinite(commissionValue) ? commissionValue : 500,
    },
  });
  res.status(201).json(provider);
}));

router.patch("/providers/:id", asyncHandler(async (req, res) => {
  const { name, status, connectorKey, commissionType, commissionValue } = req.body;
  const provider = await prisma.provider.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
      ...(connectorKey !== undefined && { connectorKey }),
      ...(commissionType !== undefined && { commissionType }),
      ...(commissionValue !== undefined && { commissionValue }),
    },
  });
  res.json(provider);
}));

// ---- Produits ----

router.get("/products", asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    include: { _count: { select: { offers: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(products);
}));

router.post("/products", asyncHandler(async (req, res) => {
  const { name, slug, category, description, consumptionType, journeyType, currency, isActive } = req.body;
  if (!name || !slug || !category || !description) {
    return res.status(400).json({ error: "name_slug_category_description_required" });
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      category,
      description,
      consumptionType: consumptionType || "UNIT",
      journeyType: journeyType || "NATIVE",
      currency: currency || "EUR",
      isActive: isActive ?? true,
    },
  });
  res.status(201).json(product);
}));

router.get("/products/:id", asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      offers: {
        include: { provider: { select: { id: true, name: true, slug: true } } },
        orderBy: { price: "asc" },
      },
    },
  });
  if (!product) return res.status(404).json({ error: "product_not_found" });
  res.json(product);
}));

router.patch("/products/:id", asyncHandler(async (req, res) => {
  const { name, category, description, isActive, journeyType, consumptionType, currency } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(journeyType !== undefined && { journeyType }),
      ...(consumptionType !== undefined && { consumptionType }),
      ...(currency !== undefined && { currency }),
    },
  });
  res.json(product);
}));

// ---- Offres ----

router.post("/offers", asyncHandler(async (req, res) => {
  const { productId, providerId, price, rating, salesCount, deliverySeconds, kycVerified } = req.body;
  if (!productId || !providerId || !Number.isFinite(price)) {
    return res.status(400).json({ error: "productId_providerId_price_required" });
  }

  const offer = await prisma.offer.create({
    data: {
      productId,
      providerId,
      price,
      rating: rating ?? null,
      salesCount: salesCount ?? 0,
      deliverySeconds: deliverySeconds ?? null,
      kycVerified: kycVerified ?? false,
    },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(offer);
}));

router.patch("/offers/:id", asyncHandler(async (req, res) => {
  const { price, rating, salesCount, deliverySeconds, kycVerified, isActive } = req.body;
  const offer = await prisma.offer.update({
    where: { id: req.params.id },
    data: {
      ...(price !== undefined && { price }),
      ...(rating !== undefined && { rating }),
      ...(salesCount !== undefined && { salesCount }),
      ...(deliverySeconds !== undefined && { deliverySeconds }),
      ...(kycVerified !== undefined && { kycVerified }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.json(offer);
}));

// ---- Commandes (toutes, tous clients confondus) ----

router.get("/orders", asyncHandler(async (req, res) => {
  const { status } = req.query;
  const orders = await prisma.order.findMany({
    where: status ? { status: String(status) as never } : undefined,
    include: {
      user: { select: { id: true, email: true, name: true } },
      product: { select: { id: true, name: true, slug: true } },
      provider: { select: { id: true, name: true, slug: true } },
      invoice: { select: { sequenceNumber: true, issuedAt: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(
    orders.map((o) => ({
      ...o,
      invoice: o.invoice ? { ...o.invoice, number: formatInvoiceNumber(o.invoice.issuedAt, o.invoice.sequenceNumber) } : null,
    }))
  );
}));

// ---- Comptes / admins ----

router.get("/users", asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
}));

router.patch("/users/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const { isAdmin } = req.body;
  if (typeof isAdmin !== "boolean") return res.status(400).json({ error: "isAdmin_boolean_required" });
  if (req.params.id === req.userId && isAdmin === false) {
    return res.status(400).json({ error: "cannot_revoke_self" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin },
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
  });
  res.json(user);
}));

export default router;

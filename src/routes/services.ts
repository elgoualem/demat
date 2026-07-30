import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /services?category=telephonie — catalogue normalisé, filtrable.
router.get("/", async (req, res) => {
  const { category } = req.query;
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...(category ? { category: String(category) } : {}),
    },
    include: { provider: { select: { name: true, slug: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(services);
});

router.get("/:slug", async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { slug: req.params.slug },
    include: { provider: true },
  });
  if (!service) return res.status(404).json({ error: "service_not_found" });
  res.json(service);
});

export default router;

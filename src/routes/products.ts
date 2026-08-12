import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// GET /products?category=telephonie — catalogue, un produit générique par ligne.
// Le prix affiché est le "à partir de" (offre active la moins chère) ; le détail
// des offres concurrentes vit sur GET /products/:slug.
router.get("/", asyncHandler(async (req, res) => {
  const { category } = req.query;
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category: String(category) } : {}),
    },
    include: { offers: { where: { isActive: true }, select: { price: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    products.map(({ offers, ...product }) => ({
      ...product,
      offerCount: offers.length,
      fromPrice: offers.length ? Math.min(...offers.map((o) => o.price)) : null,
    }))
  );
}));

// GET /products/:slug — détail produit + offres concurrentes triées par prix croissant.
router.get("/:slug", asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: {
      offers: {
        where: { isActive: true },
        include: { provider: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { price: "asc" },
      },
    },
  });
  if (!product || !product.isActive) return res.status(404).json({ error: "product_not_found" });
  res.json(product);
}));

export default router;

import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// GET /categories — arborescence complète Category > Subcategory pour la
// navigation client (menu, page /services, grille de catégories de l'accueil),
// avec le nombre de produits actifs et classés par sous-catégorie.
router.get("/", asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      },
    },
  });

  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      productCount: c.subcategories.reduce((sum, s) => sum + s._count.products, 0),
      subcategories: c.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        productCount: s._count.products,
      })),
    }))
  );
}));

export default router;

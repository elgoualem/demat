import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// GET /products?categorySlug=recharges&subcategory=recharge-telephonique — catalogue,
// un produit générique par ligne. `categorySlug` filtre sur une catégorie DigiGo
// entière (toutes ses sous-catégories confondues, pour les pages /services/:category) ;
// `subcategory` filtre sur une sous-catégorie précise ; `category` (legacy, ancien
// champ à plat) reste supporté pour compatibilité le temps que tous les produits
// soient reclassés.
// Le prix affiché est le "à partir de" (offre active la moins chère) ; le détail
// des offres concurrentes vit sur GET /products/:slug.
router.get("/", asyncHandler(async (req, res) => {
  const { category, subcategory, categorySlug } = req.query;
  // `subcategory` et `categorySlug` filtrent tous deux sur la relation Product.subcategory :
  // les combiner dans un seul objet évite qu'un spread écrase l'autre (même clé "subcategory").
  const subcategoryWhere: { slug?: string; category?: { slug: string } } = {};
  if (subcategory) subcategoryWhere.slug = String(subcategory);
  if (categorySlug) subcategoryWhere.category = { slug: String(categorySlug) };

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category: String(category) } : {}),
      ...(Object.keys(subcategoryWhere).length > 0 ? { subcategory: subcategoryWhere } : {}),
    },
    include: {
      offers: { where: { isActive: true }, select: { price: true, salesCount: true } },
      subcategory: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    products.map(({ offers, ...product }) => ({
      ...product,
      offerCount: offers.length,
      fromPrice: offers.length ? Math.min(...offers.map((o) => o.price)) : null,
      // Somme des ventes de toutes les offres actives : utilisé pour trier
      // "les plus demandés" côté accueil, jamais affiché au client tel quel.
      popularityScore: offers.reduce((sum, o) => sum + o.salesCount, 0),
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
      subcategory: { include: { category: true } },
    },
  });
  if (!product || !product.isActive) return res.status(404).json({ error: "product_not_found" });
  res.json(product);
}));

export default router;

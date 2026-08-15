interface CategoryMeta {
  label: string;
  emoji: string;
  badge: string;
}

// Métadonnées d'affichage par catégorie. Une catégorie inconnue (ajoutée
// plus tard côté données, sans changement de code) retombe sur un style
// neutre via `getCategoryMeta` — pas besoin de toucher ce fichier pour
// qu'une nouvelle catégorie s'affiche correctement.
const CATEGORY_META: Record<string, CategoryMeta> = {
  telephonie: { label: "Téléphonie", emoji: "📱", badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100" },
  argent: { label: "Argent", emoji: "💳", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" },
  voyage: { label: "Voyage", emoji: "✈️", badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100" },
};

const DEFAULT_META: CategoryMeta = { label: "Autre", emoji: "🔹", badge: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200" };

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { ...DEFAULT_META, label: category };
}

// Couleur de badge par catégorie DigiGo (taxonomie Category/Subcategory,
// voir prisma/seed.ts). Un slug non listé retombe sur un style neutre plutôt
// que de bloquer l'affichage — une nouvelle catégorie ajoutée en base
// s'affiche toujours correctement sans changement de code ici.
const DIGIGO_CATEGORY_BADGE: Record<string, string> = {
  recharges: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100",
  "argent-paiements": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  "cartes-prepayees": "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-100",
  voyages: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  assurances: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100",
  "factures-services": "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100",
};

interface ProductLike {
  category: string;
  subcategory: { category: { name: string; slug: string; icon: string } } | null;
}

// Préfère la taxonomie DigiGo (subcategory.category) quand le produit est
// classé ; retombe sur l'ancien champ `category` à plat sinon (produit pas
// encore reclassé — voir la note dans prisma/schema.prisma sur Product.category).
export function getProductCategoryMeta(product: ProductLike): CategoryMeta {
  if (product.subcategory) {
    const cat = product.subcategory.category;
    return { label: cat.name, emoji: cat.icon, badge: DIGIGO_CATEGORY_BADGE[cat.slug] ?? DEFAULT_META.badge };
  }
  return getCategoryMeta(product.category);
}

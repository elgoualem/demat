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

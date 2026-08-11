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
  telephonie: { label: "Téléphonie", emoji: "📱", badge: "bg-blue-100 text-blue-700" },
  argent: { label: "Argent", emoji: "💳", badge: "bg-emerald-100 text-emerald-700" },
  voyage: { label: "Voyage", emoji: "✈️", badge: "bg-amber-100 text-amber-700" },
};

const DEFAULT_META: CategoryMeta = { label: "Autre", emoji: "🔹", badge: "bg-slate-100 text-slate-700" };

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { ...DEFAULT_META, label: category };
}

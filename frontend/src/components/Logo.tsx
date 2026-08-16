import Link from "next/link";

// Mark + wordmark DigiGo, réutilisés partout où la marque doit être visible
// (header, pied de page) — même traitement que le badge déjà utilisé dans
// app/opengraph-image.tsx (pastille brand-600 + "D"), pour une identité
// cohérente entre le site et les aperçus de partage.
const SIZES = {
  sm: { badge: "h-7 w-7 rounded-lg text-sm", word: "text-xl", gap: "gap-2" },
  md: { badge: "h-8 w-8 rounded-xl text-base", word: "text-2xl", gap: "gap-2.5" },
} as const;

export default function Logo({ size = "md", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <Link
      href="/"
      className={`flex shrink-0 items-center whitespace-nowrap font-serif tracking-tight ${s.gap} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex items-center justify-center font-bold text-white bg-brand-600 ${s.badge}`}
      >
        D
      </span>
      <span className={s.word}>
        <span className="text-stone-900">Digi</span>
        <span className="text-brand-600">Go</span>
      </span>
    </Link>
  );
}

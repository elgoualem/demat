"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, CategoryTreeNode, ApiError } from "@/lib/api";

export default function ServicesPageClient() {
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les catégories."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">
          Accueil
        </Link>{" "}
        / <span className="text-stone-900">Services</span>
      </p>

      <h1 className="mb-2 font-serif text-4xl text-stone-900">Tous les services</h1>
      <p className="mb-10 max-w-xl text-stone-500">
        Recharges, argent, cartes prépayées, voyages, assurances et factures — parcourez le catalogue complet par
        catégorie.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-stone-500">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/services/${category.slug}`}
              className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-3xl">{category.icon}</span>
              <h2 className="font-semibold text-stone-900">{category.name}</h2>
              <p className="text-sm text-stone-400">
                {category.productCount} produit{category.productCount > 1 ? "s" : ""} ·{" "}
                {category.subcategories.length} sous-catégorie{category.subcategories.length > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

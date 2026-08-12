"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProducts, Product, ApiError } from "@/lib/api";
import { getCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
    });
  }, [products, activeCategory, search]);

  const totalOffers = useMemo(() => products.reduce((sum, p) => sum + p.offerCount, 0), [products]);
  const maxOffers = useMemo(() => products.reduce((max, p) => Math.max(max, p.offerCount), 0), [products]);

  return (
    <div>
      {/* Hero */}
      <section className="mb-14">
        <p className="mb-3 text-xs font-semibold tracking-widest text-brand-600 uppercase">Place de marché vérifiée</p>
        <h1 className="font-serif text-5xl leading-[1.1] text-stone-900">
          Rechargez en <span className="italic text-brand-600">3 étapes.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-stone-500">
          Des fournisseurs vérifiés proposent leur prix sur chaque service. Téléphonie, argent, voyage — un seul
          endroit pour comparer et souscrire.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#catalogue"
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Parcourir le catalogue
          </a>
          <Link
            href="/register"
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Créer un compte
          </Link>
        </div>
      </section>

      {/* Stats */}
      {!loading && products.length > 0 && (
        <section className="mb-14 grid grid-cols-2 gap-6 border-y border-stone-200 py-6 sm:grid-cols-3">
          <div>
            <p className="font-serif text-3xl text-stone-900">{products.length}</p>
            <p className="text-sm text-stone-500">produits au catalogue</p>
          </div>
          <div>
            <p className="font-serif text-3xl text-stone-900">{totalOffers}</p>
            <p className="text-sm text-stone-500">offres actives, tous fournisseurs</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="font-serif text-3xl text-stone-900">{maxOffers}</p>
            <p className="text-sm text-stone-500">fournisseurs en compétition sur un même produit</p>
          </div>
        </section>
      )}

      {/* Catalogue */}
      <section id="catalogue">
        <h2 className="mb-6 font-serif text-3xl text-stone-900">Catalogue</h2>

        <div className="relative mb-6">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-stone-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === null ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              Tout
            </button>
            {categories.map((category) => {
              const meta = getCategoryMeta(category);
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {meta.emoji} {meta.label}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement du catalogue…</p>
        ) : filtered.length === 0 ? (
          <p className="text-stone-500">
            {search ? `Aucun résultat pour « ${search} ».` : "Aucun produit dans cette catégorie pour l'instant."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => {
              const meta = getCategoryMeta(product.category);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <h3 className="font-semibold text-stone-900">{product.name}</h3>
                  <p className="flex-1 text-sm text-stone-600">{product.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-xs text-stone-400">à partir de</p>
                      <p className="text-lg font-bold text-stone-900">
                        {product.fromPrice !== null ? formatPrice(product.fromPrice, product.currency) : "—"}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                      {product.offerCount} fournisseur{product.offerCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

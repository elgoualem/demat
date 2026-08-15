"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getProducts, getCategories, Product, CategoryTreeNode, ApiError } from "@/lib/api";
import { getProductCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, []);

  // Synchronise avec ?category=slug et ?q=texte (liens du header et de la
  // recherche, atteignables depuis n'importe quelle page) : applique le
  // filtre et défile vers le catalogue dès que ces paramètres sont présents.
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const queryParam = searchParams.get("q");
    if (categoryParam) setActiveCategory(categoryParam);
    if (queryParam) setSearch(queryParam);
    if (categoryParam || queryParam) {
      document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.subcategory?.category.slug !== activeCategory) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
    });
  }, [products, activeCategory, search]);

  const totalOffers = useMemo(() => products.reduce((sum, p) => sum + p.offerCount, 0), [products]);
  const maxOffers = useMemo(() => products.reduce((max, p) => Math.max(max, p.offerCount), 0), [products]);

  const mostRequested = useMemo(
    () => [...products].sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 4),
    [products]
  );

  const voyagesCategory = categories.find((c) => c.slug === "voyages");

  function goToCategory(categorySlug: string | null) {
    setActiveCategory(categorySlug);
    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value) document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div>
      {/* Hero */}
      <section className="mb-10">
        <p className="mb-3 text-xs font-semibold tracking-widest text-brand-600 uppercase">Place de marché vérifiée</p>
        <h1 className="font-serif text-5xl leading-[1.1] text-stone-900">
          Rechargez. <span className="text-brand-600">Payez.</span> Voyagez.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-stone-500">
          Tout ce dont vous avez besoin, au même endroit.
        </p>

        <div className="relative mt-7 max-w-xl">
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
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher un produit… (ex : forfait mobile, transfert d'argent)"
            className="w-full rounded-xl border border-stone-200 bg-white py-3.5 pl-12 pr-4 text-stone-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="#catalogue"
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Commencer maintenant
          </a>
          <a
            href="#categories"
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Découvrir les services
          </a>
        </div>

        {/* Réassurance immédiate */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
            <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l1.5 1.5 3-3.75M12 3l7.5 3v5.25c0 4.5-3.15 8.55-7.5 9.75-4.35-1.2-7.5-5.25-7.5-9.75V6l7.5-3z" />
            </svg>
            Paiement sécurisé
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
            <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l1.5 1.5 3-3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fournisseurs vérifiés (KYC)
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
            <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Commande suivie en temps réel
          </span>
        </div>
      </section>

      {/* Arguments de confiance — chiffres réels, jamais inventés */}
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

      {/* Cartes d'accès rapide */}
      {categories.length > 0 && (
        <section id="categories" className="mb-14 scroll-mt-24">
          <h2 className="mb-6 font-serif text-3xl text-stone-900">Parcourir par catégorie</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => goToCategory(category.slug)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="font-semibold text-stone-900">{category.name}</span>
                <span className="text-xs text-stone-400">
                  {category.productCount} produit{category.productCount > 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Services les plus demandés */}
      {mostRequested.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-6 font-serif text-3xl text-stone-900">Les plus demandés</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {mostRequested.map((product) => {
              const meta = getProductCategoryMeta(product);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <h3 className="font-semibold text-stone-900">{product.name}</h3>
                  <p className="text-lg font-bold text-stone-900">
                    {product.fromPrice !== null ? formatPrice(product.fromPrice, product.currency) : "—"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="mb-14 scroll-mt-24">
        <h2 className="mb-2 font-serif text-3xl text-stone-900">DigiGo, c&apos;est simple</h2>
        <p className="mb-8 max-w-xl text-stone-500">De la sélection à la réception, trois étapes simples et suivies de bout en bout.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15zM9 11h4" />
              ),
              title: "Comparez",
              text: "Choisissez un produit et comparez le prix des fournisseurs vérifiés qui le proposent.",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 8.25v9a1.5 1.5 0 001.5 1.5h16.5a1.5 1.5 0 001.5-1.5v-9M2.25 8.25v-1.5a1.5 1.5 0 011.5-1.5h16.5a1.5 1.5 0 011.5 1.5v1.5M6 15h3" />
              ),
              title: "Payez",
              text: "Réglez en toute sécurité en quelques secondes, sans quitter la plateforme.",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ),
              title: "Recevez",
              text: "Suivez le statut de votre commande en direct et téléchargez votre facture dès la confirmation.",
            },
          ].map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-serif text-sm text-white">
                {i + 1}
              </span>
              <svg className="mb-3 h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {step.icon}
              </svg>
              <h3 className="mb-1.5 font-semibold text-stone-900">{step.title}</h3>
              <p className="text-sm text-stone-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section voyages */}
      {voyagesCategory && voyagesCategory.productCount > 0 && (
        <section className="mb-14 overflow-hidden rounded-3xl bg-navy p-8 text-white sm:p-12">
          <p className="mb-2 text-xs font-semibold tracking-widest text-turquoise uppercase">Voyages</p>
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
            Vos prochains billets et séjours, réservés en toute confiance.
          </h2>
          <p className="mt-3 max-w-lg text-white/70">
            {voyagesCategory.productCount} offre{voyagesCategory.productCount > 1 ? "s" : ""} disponible
            {voyagesCategory.productCount > 1 ? "s" : ""} sur DigiGo — comparez les fournisseurs vérifiés avant de réserver.
          </p>
          <button
            onClick={() => goToCategory("voyages")}
            className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-medium text-navy transition hover:bg-white/90"
          >
            Voir les offres voyage
          </button>
        </section>
      )}

      {/* Section fidélisation */}
      <section className="mb-14 rounded-3xl border border-stone-200 bg-white p-8 sm:p-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-brand-600 uppercase">Programme DigiGo</p>
            <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
              Un compte, tous vos avantages.
            </h2>
            <p className="mt-3 max-w-lg text-stone-500">
              Historique centralisé, factures toujours accessibles, et accès en avant-première aux offres
              réservées aux membres.
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Créer un compte gratuit
          </Link>
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className="scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-3xl text-stone-900">Catalogue</h2>
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              ← Voir tout le catalogue
            </button>
          )}
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
              const active = activeCategory === category.slug;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.slug)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {category.icon} {category.name}
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
              const meta = getProductCategoryMeta(product);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- images arbitraires importées d'un fournisseur, domaine non prévisible
                    <img src={product.imageUrl} alt="" className="h-36 w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5 pt-0 first:pt-5">
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

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCategories, getProducts, CategoryTreeNode, Product, ApiError } from "@/lib/api";
import { getProductCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Chargement…</p>}>
      <CategoryPageContent />
    </Suspense>
  );
}

function CategoryPageContent() {
  const params = useParams<{ category: string }>();
  const [category, setCategory] = useState<CategoryTreeNode | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((all) => {
        const found = all.find((c) => c.slug === params.category);
        if (!found) {
          setNotFound(true);
          return;
        }
        setCategory(found);
      })
      .catch(() => setError("Impossible de charger cette catégorie."));
  }, [params.category]);

  useEffect(() => {
    if (notFound) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProducts({ categorySlug: params.category, subcategory: activeSubcategory ?? undefined })
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Impossible de charger les produits.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.category, activeSubcategory, notFound]);

  if (notFound) {
    return (
      <div>
        <p className="mb-4 text-sm text-stone-500">
          <Link href="/" className="hover:text-stone-900">
            Accueil
          </Link>{" "}
          /{" "}
          <Link href="/services" className="hover:text-stone-900">
            Services
          </Link>
        </p>
        <p className="text-stone-500">Cette catégorie n&apos;existe pas.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">
          Accueil
        </Link>{" "}
        /{" "}
        <Link href="/services" className="hover:text-stone-900">
          Services
        </Link>{" "}
        / <span className="text-stone-900">{category?.name ?? "…"}</span>
      </p>

      {category && (
        <>
          <h1 className="mb-2 flex items-center gap-3 font-serif text-4xl text-stone-900">
            <span>{category.icon}</span>
            {category.name}
          </h1>
          <p className="mb-8 max-w-xl text-stone-500">
            {category.productCount} produit{category.productCount > 1 ? "s" : ""} disponible
            {category.productCount > 1 ? "s" : ""} chez des fournisseurs vérifiés.
          </p>

          {category.subcategories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveSubcategory(null)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeSubcategory === null ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                }`}
              >
                Tout
              </button>
              {category.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubcategory(sub.slug)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeSubcategory === sub.slug ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {sub.name} · {sub.productCount}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-stone-500">Chargement des produits…</p>
      ) : products.length === 0 ? (
        <p className="text-stone-500">Aucun produit dans cette catégorie pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
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
    </div>
  );
}

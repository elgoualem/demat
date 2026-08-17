"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import {
  getAdminProduct,
  updateAdminProduct,
  createAdminOffer,
  updateAdminOffer,
  getAdminProviders,
  getAdminCategories,
  AdminProductDetail,
  AdminProvider,
  AdminCategory,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminProductDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOfferId, setSavingOfferId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [providerId, setProviderId] = useState("");
  const [price, setPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, provs, cats] = await Promise.all([
        getAdminProduct(token, params.id),
        getAdminProviders(token),
        getAdminCategories(token),
      ]);
      setProduct(p);
      setProviders(provs);
      setCategories(cats);
      if (!providerId && provs.length > 0) setProviderId(provs[0].id);
      if (p.subcategory) {
        setCategoryId(p.subcategory.category.id);
        setSubcategoryId(p.subcategory.id);
      } else if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
    // providerId volontairement absent des deps : ne pré-remplir qu'au premier chargement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const subcategoriesForSelectedCategory = categories.find((c) => c.id === categoryId)?.subcategories ?? [];

  async function toggleProductActive() {
    if (!token || !product) return;
    try {
      const updated = await updateAdminProduct(token, product.id, { isActive: !product.isActive });
      setProduct((prev) => (prev ? { ...prev, isActive: updated.isActive } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    }
  }

  async function handleSaveCategory(newSubcategoryId: string) {
    if (!token || !product || !newSubcategoryId) return;
    const selectedCategory = categories.find((c) => c.id === categoryId);
    if (!selectedCategory) return;
    setSavingCategory(true);
    setError(null);
    try {
      const updated = await updateAdminProduct(token, product.id, {
        category: selectedCategory.slug,
        subcategoryId: newSubcategoryId,
      });
      setProduct((prev) => (prev ? { ...prev, category: updated.category, subcategory: updated.subcategory } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingCategory(false);
    }
  }

  async function toggleOfferActive(offerId: string, current: boolean) {
    if (!token) return;
    setSavingOfferId(offerId);
    try {
      const updated = await updateAdminOffer(token, offerId, { isActive: !current });
      setProduct((prev) => (prev ? { ...prev, offers: prev.offers.map((o) => (o.id === offerId ? updated : o)) } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingOfferId(null);
    }
  }

  async function updateOfferPrice(offerId: string, newPrice: number, currentPrice: number) {
    if (!token || newPrice === currentPrice) return;
    setSavingOfferId(offerId);
    try {
      const updated = await updateAdminOffer(token, offerId, { price: newPrice });
      setProduct((prev) => (prev ? { ...prev, offers: prev.offers.map((o) => (o.id === offerId ? updated : o)) } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingOfferId(null);
    }
  }

  async function handleCreateOffer(e: FormEvent) {
    e.preventDefault();
    if (!token || !product) return;
    setCreating(true);
    setError(null);
    try {
      await createAdminOffer(token, { productId: product.id, providerId, price: Math.round(Number(price) * 100) });
      setPrice("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error && !product) return <p className="text-sm text-red-600">{error}</p>;
  if (!product) return null;

  return (
    <AdminGuard scope="CATALOG">
      <div>
        <Link href="/admin/products" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Produits
        </Link>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl text-stone-900">{product.name}</h1>
            <p className="mt-1 text-stone-500">{product.slug}</p>
          </div>
          <button
            onClick={toggleProductActive}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              product.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" : "bg-stone-100 text-stone-600"
            }`}
          >
            {product.isActive ? "Actif" : "Inactif"}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">Catégorie</span>
            <select
              value={categoryId}
              disabled={savingCategory}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">Sous-catégorie</span>
            <select
              value={subcategoryId}
              disabled={savingCategory}
              onChange={(e) => {
                setSubcategoryId(e.target.value);
                handleSaveCategory(e.target.value);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {subcategoriesForSelectedCategory.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {!product.subcategory && <span className="text-xs italic text-amber-600">Non classé ({product.category})</span>}
          {savingCategory && <span className="text-xs text-stone-400">Enregistrement…</span>}
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                <th className="p-3 font-medium">Fournisseur</th>
                <th className="p-3 font-medium">Prix</th>
                <th className="p-3 font-medium">Note</th>
                <th className="p-3 font-medium">Ventes</th>
                <th className="p-3 font-medium">Actif</th>
              </tr>
            </thead>
            <tbody>
              {product.offers.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 last:border-0">
                  <td className="p-3 font-medium text-stone-900">{o.provider.name}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={(o.price / 100).toFixed(2)}
                      disabled={savingOfferId === o.id}
                      onBlur={(e) => updateOfferPrice(o.id, Math.round(Number(e.target.value) * 100), o.price)}
                      className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="p-3 text-stone-600">{o.rating !== null ? `${o.rating.toFixed(1)} ★` : "—"}</td>
                  <td className="p-3 text-stone-600">{o.salesCount.toLocaleString("fr-FR")}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleOfferActive(o.id, o.isActive)}
                      disabled={savingOfferId === o.id}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        o.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {o.isActive ? "Actif" : "Inactif"}
                    </button>
                  </td>
                </tr>
              ))}
              {product.offers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-stone-400">Aucune offre pour ce produit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-stone-900">Ajouter une offre</h2>
          <form onSubmit={handleCreateOffer} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Fournisseur</span>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Prix ({product.currency})</span>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <button
              type="submit"
              disabled={creating || providers.length === 0}
              className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Ajout…" : "Ajouter l'offre"}
            </button>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}

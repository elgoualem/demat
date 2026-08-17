"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getAdminProducts, createAdminProduct, updateAdminProduct, getAdminCategories, AdminProduct, AdminCategory, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getAdminProducts(token), getAdminCategories(token)])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
        if (c.length > 0) setCategoryId(c[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  const subcategoriesForSelectedCategory = categories.find((c) => c.id === categoryId)?.subcategories ?? [];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const selectedCategory = categories.find((c) => c.id === categoryId);
    if (!selectedCategory || !subcategoryId) {
      setError("Choisissez une catégorie et une sous-catégorie DigiGo.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createAdminProduct(token, {
        name,
        slug,
        category: selectedCategory.slug,
        subcategoryId,
        description,
        imageUrl: imageUrl || undefined,
      });
      setName("");
      setSlug("");
      setSubcategoryId("");
      setDescription("");
      setImageUrl("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(p: AdminProduct) {
    if (!token) return;
    setSavingId(p.id);
    try {
      const updated = await updateAdminProduct(token, p.id, { isActive: !p.isActive });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminGuard scope="CATALOG">
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-6 font-serif text-3xl text-stone-900">Produits</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Catégorie</th>
                  <th className="p-3 font-medium">Offres</th>
                  <th className="p-3 font-medium">Actif</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50 last:border-0">
                    <td className="p-3">
                      <p className="font-medium text-stone-900">{p.name}</p>
                      <p className="text-xs text-stone-400">{p.slug}</p>
                    </td>
                    <td className="p-3 text-stone-600">
                      {p.subcategory ? (
                        <span>
                          {p.subcategory.category.icon} {p.subcategory.category.name} · {p.subcategory.name}
                        </span>
                      ) : (
                        <span className="italic text-amber-600">{p.category} (non classé)</span>
                      )}
                    </td>
                    <td className="p-3 text-stone-600">{p._count.offers}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={savingId === p.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          p.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {p.isActive ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/products/${p.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                        Gérer les offres →
                      </Link>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">Aucun produit.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-stone-900">Ajouter un produit</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Nom</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Slug</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mon-produit"
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-700">Catégorie</span>
                <select
                  required
                  value={categoryId}
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
                  required
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
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
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Description</span>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Image (URL, optionnel)</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Création…" : "Créer"}
            </button>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getServices, createOrder, listOrganizations, Service, Organization, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function CataloguePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [buyingAs, setBuyingAs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (token) listOrganizations(token).then(setOrgs).catch(() => {});
    else setOrgs([]);
  }, [token]);

  const categories = useMemo(() => Array.from(new Set(services.map((s) => s.category))), [services]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((s) => {
      if (activeCategory && s.category !== activeCategory) return false;
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.provider.name.toLowerCase().includes(query)
      );
    });
  }, [services, activeCategory, search]);

  async function handleOrder(serviceId: string) {
    if (!token) {
      router.push("/login");
      return;
    }
    setOrderingId(serviceId);
    setError(null);
    try {
      const order = await createOrder(token, serviceId, buyingAs || null);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
      setOrderingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dématérialisez tout ce qui peut l&apos;être</h1>
        <p className="mt-2 text-slate-500">Téléphonie, argent, voyage — un seul endroit pour souscrire et suivre vos services.</p>
        <p className="mt-1 text-sm text-slate-400">Paiement sécurisé · Confirmation instantanée</p>
      </div>

      <div className="relative mb-8">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
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
          placeholder="Rechercher un service, un fournisseur…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {orgs.length > 0 && (
        <label className="mb-6 flex w-fit items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Commander pour :</span>
          <select
            value={buyingAs}
            onChange={(e) => setBuyingAs(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Moi-même</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeCategory === null ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
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
                  active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
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
        <p className="text-slate-500">Chargement du catalogue…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">
          {search ? `Aucun résultat pour « ${search} ».` : "Aucun service dans cette catégorie pour l'instant."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => {
            const meta = getCategoryMeta(service.category);
            return (
              <div
                key={service.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
                  {meta.emoji} {meta.label}
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">{service.name}</h2>
                  <p className="text-sm text-slate-500">{service.provider.name}</p>
                </div>
                <p className="flex-1 text-sm text-slate-600">{service.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-slate-900">{formatPrice(service.price, service.currency)}</span>
                  <button
                    onClick={() => handleOrder(service.id)}
                    disabled={orderingId === service.id}
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {orderingId === service.id ? "Commande…" : "Commander"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

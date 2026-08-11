"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getServices, createOrder, Service, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function CataloguePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(services.map((s) => s.category))), [services]);
  const filtered = activeCategory ? services.filter((s) => s.category === activeCategory) : services;

  async function handleOrder(serviceId: string) {
    if (!token) {
      router.push("/login");
      return;
    }
    setOrderingId(serviceId);
    setError(null);
    try {
      const order = await createOrder(token, serviceId);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
      setOrderingId(null);
    }
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dématérialisez tout ce qui peut l&apos;être</h1>
        <p className="mt-2 text-slate-500">Téléphonie, argent, voyage — un seul endroit pour souscrire et suivre vos services.</p>
      </div>

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
        <p className="text-slate-500">Aucun service dans cette catégorie pour l&apos;instant.</p>
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

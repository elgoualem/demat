"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getAdminProviderDetail, updateAdminProvider, ProviderDetail, AdminProvider, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";

const STATUS_OPTIONS = ["ACTIVE", "DEGRADED", "DOWN"] as const;
const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  FAILED: "Échouée",
  REFUNDED: "Remboursée",
  EXPIRED: "Expirée",
};

export default function AdminProviderDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await getAdminProviderDetail(token, params.id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(update: Partial<AdminProvider>) {
    if (!token || !data) return;
    setSaving(true);
    try {
      const updated = await updateAdminProvider(token, data.provider.id, update);
      setData((prev) => (prev ? { ...prev, provider: { ...prev.provider, ...updated } } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error && !data) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { provider, offers, summary, orders } = data;

  return (
    <AdminGuard>
      <div>
        <Link href="/admin/providers" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Fournisseurs
        </Link>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl text-stone-900">{provider.name}</h1>
            <p className="mt-1 text-stone-500">{provider.slug} · connecteur {provider.connectorKey}</p>
          </div>
          <select
            value={provider.status}
            disabled={saving}
            onChange={(e) => handleUpdate({ status: e.target.value as AdminProvider["status"] })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-stone-400">Chiffre d&apos;affaires (confirmées)</p>
            <p className="mt-1 font-serif text-2xl text-stone-900">{formatPrice(summary.totalAmount, "EUR")}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-stone-400">Commission générée</p>
            <p className="mt-1 font-serif text-2xl text-stone-900">{formatPrice(summary.totalCommission, "EUR")}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-stone-400">Commandes</p>
            <p className="mt-1 font-serif text-2xl text-stone-900">{summary.confirmedCount} / {summary.orderCount}</p>
            <p className="text-xs text-stone-400">confirmées / total</p>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-semibold text-stone-900">Commission</h2>
        </div>
        <div className="mb-8 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <select
            value={provider.commissionType}
            disabled={saving}
            onChange={(e) => handleUpdate({ commissionType: e.target.value as AdminProvider["commissionType"] })}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">Fixe (centimes)</option>
          </select>
          <input
            type="number"
            defaultValue={provider.commissionValue}
            disabled={saving}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (val !== provider.commissionValue) handleUpdate({ commissionValue: val });
            }}
            className="w-32 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-xs text-stone-400">
            {provider.commissionType === "PERCENTAGE" ? "points de base (500 = 5%)" : "centimes"}
          </span>
        </div>

        <h2 className="mb-3 font-semibold text-stone-900">Offres ({offers.length})</h2>
        <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                <th className="p-3 font-medium">Produit</th>
                <th className="p-3 font-medium">Catégorie</th>
                <th className="p-3 font-medium">Prix</th>
                <th className="p-3 font-medium">Note</th>
                <th className="p-3 font-medium">Ventes</th>
                <th className="p-3 font-medium">Actif</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 last:border-0">
                  <td className="p-3">
                    <Link href={`/admin/products/${o.product.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {o.product.name}
                    </Link>
                  </td>
                  <td className="p-3 text-stone-600">{o.product.category}</td>
                  <td className="p-3 text-stone-900">{formatPrice(o.price, "EUR")}</td>
                  <td className="p-3 text-stone-600">{o.rating !== null ? `${o.rating.toFixed(1)} ★` : "—"}</td>
                  <td className="p-3 text-stone-600">{o.salesCount.toLocaleString("fr-FR")}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" : "bg-stone-100 text-stone-600"}`}>
                      {o.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-stone-400">Aucune offre pour ce fournisseur.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 font-semibold text-stone-900">Commandes récentes</h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Produit</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Montant</th>
                <th className="p-3 font-medium">Commission</th>
                <th className="p-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 last:border-0">
                  <td className="p-3 text-stone-500">{formatDate(o.createdAt)}</td>
                  <td className="p-3 font-medium text-stone-900">{o.product.name}</td>
                  <td className="p-3 text-stone-600">{o.user.email}</td>
                  <td className="p-3 text-stone-900">{formatPrice(o.amount, o.currency)}</td>
                  <td className="p-3 text-stone-600">{formatPrice(o.platformFee, o.currency)}</td>
                  <td className="p-3 text-stone-500">{STATUS_LABEL[o.status]}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-stone-400">Aucune commande pour ce fournisseur.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}

"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import {
  getAdminProviders,
  createAdminProvider,
  updateAdminProvider,
  AdminProvider,
  AdminProviderWrite,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CONNECTOR_KEYS = ["mock-telecom", "mock-finance", "mock-voyage", "generic-rest"];
const STATUS_OPTIONS = ["ACTIVE", "DEGRADED", "DOWN"] as const;

export default function AdminProvidersPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [connectorKey, setConnectorKey] = useState(CONNECTOR_KEYS[0]);
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState("500");
  const [creating, setCreating] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    getAdminProviders(token)
      .then(setProviders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      await createAdminProvider(token, {
        name,
        slug,
        connectorKey,
        commissionType,
        commissionValue: Number(commissionValue),
      });
      setName("");
      setSlug("");
      setCommissionValue("500");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  async function handleFieldUpdate(id: string, data: AdminProviderWrite) {
    if (!token) return;
    setSavingId(id);
    try {
      const updated = await updateAdminProvider(token, id, data);
      setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminGuard scope="PROVIDERS">
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-6 font-serif text-3xl text-stone-900">Fournisseurs</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Connecteur</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Commission</th>
                  <th className="p-3 font-medium">Offres</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50 last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/providers/${p.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                        {p.name}
                      </Link>
                      <p className="text-xs text-stone-400">{p.slug}</p>
                    </td>
                    <td className="p-3 text-stone-600">{p.connectorKey}</td>
                    <td className="p-3">
                      <select
                        value={p.status}
                        disabled={savingId === p.id}
                        onChange={(e) => handleFieldUpdate(p.id, { status: e.target.value as AdminProvider["status"] })}
                        className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={p.commissionType}
                          disabled={savingId === p.id}
                          onChange={(e) => handleFieldUpdate(p.id, { commissionType: e.target.value as AdminProvider["commissionType"] })}
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="PERCENTAGE">%</option>
                          <option value="FIXED">Fixe (c)</option>
                        </select>
                        <input
                          type="number"
                          defaultValue={p.commissionValue}
                          disabled={savingId === p.id}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== p.commissionValue) handleFieldUpdate(p.id, { commissionValue: val });
                          }}
                          className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-stone-600">{p._count.offers}</td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">Aucun fournisseur.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-stone-900">Ajouter un fournisseur</h2>
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
                placeholder="mon-fournisseur"
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Connecteur</span>
              <select
                value={connectorKey}
                onChange={(e) => setConnectorKey(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {CONNECTOR_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              {connectorKey === "generic-rest" && (
                <span className="text-xs text-stone-400">
                  L&apos;URL de l&apos;API, la clé et le mapping de réponse se configurent depuis la fiche du fournisseur après création.
                </span>
              )}
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-700">Type de commission</span>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as "PERCENTAGE" | "FIXED")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="PERCENTAGE">Pourcentage</option>
                  <option value="FIXED">Montant fixe</option>
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-700">
                  {commissionType === "PERCENTAGE" ? "Points de base (500 = 5%)" : "Centimes"}
                </span>
                <input
                  type="number"
                  required
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>
            </div>
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

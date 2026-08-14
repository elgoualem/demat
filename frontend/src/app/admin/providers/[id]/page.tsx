"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import {
  getAdminProviderDetail,
  updateAdminProvider,
  importProviderCatalog,
  ProviderDetail,
  AdminProvider,
  AdminProviderWrite,
  CatalogImportResult,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";

const STATUS_OPTIONS = ["ACTIVE", "DEGRADED", "DOWN"] as const;
const CONNECTOR_KEYS = ["mock-telecom", "mock-finance", "mock-voyage", "generic-rest"];
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

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiAuthHeader, setApiAuthHeader] = useState("Authorization");
  const [apiAuthPrefix, setApiAuthPrefix] = useState("Bearer ");
  const [apiOrderPath, setApiOrderPath] = useState("/orders");
  const [apiStatusField, setApiStatusField] = useState("status");
  const [apiOrderIdField, setApiOrderIdField] = useState("provider_order_id");
  const [apiConfirmedValue, setApiConfirmedValue] = useState("confirmed");
  const [apiCatalogPath, setApiCatalogPath] = useState("/catalog");
  const [savingApiConfig, setSavingApiConfig] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CatalogImportResult | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await getAdminProviderDetail(token, params.id);
      setData(result);
      setApiBaseUrl(result.provider.apiBaseUrl ?? "");
      setApiAuthHeader(result.provider.apiAuthHeader);
      setApiAuthPrefix(result.provider.apiAuthPrefix);
      setApiOrderPath(result.provider.apiOrderPath);
      setApiStatusField(result.provider.apiStatusField);
      setApiOrderIdField(result.provider.apiOrderIdField);
      setApiConfirmedValue(result.provider.apiConfirmedValue);
      setApiCatalogPath(result.provider.apiCatalogPath);
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

  async function handleSaveApiConfig(e: FormEvent) {
    e.preventDefault();
    if (!token || !data) return;
    setSavingApiConfig(true);
    setError(null);
    try {
      const updated = await updateAdminProvider(token, data.provider.id, {
        apiBaseUrl,
        apiAuthHeader,
        apiAuthPrefix,
        apiOrderPath,
        apiStatusField,
        apiOrderIdField,
        apiConfirmedValue,
        apiCatalogPath,
        ...(apiKey && { apiKey }),
      });
      setData((prev) => (prev ? { ...prev, provider: { ...prev.provider, ...updated } } : prev));
      setApiKey("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setSavingApiConfig(false);
    }
  }

  async function handleImportCatalog() {
    if (!token || !data) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await importProviderCatalog(token, data.provider.id);
      setImportResult(result);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setImporting(false);
    }
  }

  async function handleUpdate(update: AdminProviderWrite) {
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
            <p className="mt-1 text-stone-500">{provider.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={provider.connectorKey}
              disabled={saving}
              onChange={(e) => handleUpdate({ connectorKey: e.target.value })}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {CONNECTOR_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
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

        {provider.connectorKey === "generic-rest" && (
          <>
            <h2 className="mb-3 font-semibold text-stone-900">Connexion API</h2>
            <form onSubmit={handleSaveApiConfig} className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm text-stone-500">
                Contrat attendu : POST vers l&apos;URL ci-dessous avec <code>external_reference</code>,{" "}
                <code>idempotency_key</code>, <code>amount</code>, <code>currency</code>. La réponse doit contenir un
                champ de statut et, si succès, un identifiant de commande — leurs noms sont configurables ci-dessous
                si l&apos;API du fournisseur ne suit pas exactement les noms par défaut.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">URL de base de l&apos;API</span>
                  <input
                    type="url"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="https://api.fournisseur.com"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">
                    Clé API {provider.apiKeySet && <span className="text-emerald-600">(déjà configurée)</span>}
                  </span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider.apiKeySet ? "•••••••• (laisser vide pour ne pas changer)" : "Clé API"}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">En-tête d&apos;authentification</span>
                  <input
                    type="text"
                    value={apiAuthHeader}
                    onChange={(e) => setApiAuthHeader(e.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Préfixe de la valeur</span>
                  <input
                    type="text"
                    value={apiAuthPrefix}
                    onChange={(e) => setApiAuthPrefix(e.target.value)}
                    placeholder="Bearer "
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Chemin de création de commande</span>
                  <input
                    type="text"
                    value={apiOrderPath}
                    onChange={(e) => setApiOrderPath(e.target.value)}
                    placeholder="/orders"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Champ de statut dans la réponse</span>
                  <input
                    type="text"
                    value={apiStatusField}
                    onChange={(e) => setApiStatusField(e.target.value)}
                    placeholder="status"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Champ de l&apos;identifiant commande</span>
                  <input
                    type="text"
                    value={apiOrderIdField}
                    onChange={(e) => setApiOrderIdField(e.target.value)}
                    placeholder="provider_order_id"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Valeur signifiant &laquo; confirmée &raquo;</span>
                  <input
                    type="text"
                    value={apiConfirmedValue}
                    onChange={(e) => setApiConfirmedValue(e.target.value)}
                    placeholder="confirmed"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Chemin du catalogue</span>
                  <input
                    type="text"
                    value={apiCatalogPath}
                    onChange={(e) => setApiCatalogPath(e.target.value)}
                    placeholder="/catalog"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={savingApiConfig}
                className="mt-4 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingApiConfig ? "Enregistrement…" : "Enregistrer la config API"}
              </button>
            </form>

            <h2 className="mb-3 font-semibold text-stone-900">Importer le catalogue</h2>
            <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm text-stone-500">
                Récupère la liste des produits via <code>GET {apiBaseUrl || "{apiBaseUrl}"}{apiCatalogPath}</code> et
                crée ou met à jour les produits et offres correspondants. Les produits déjà existants (même slug)
                voient leur prix mis à jour ; leur image n&apos;est remplacée que si elle n&apos;était pas déjà définie.
              </p>
              <button
                type="button"
                onClick={handleImportCatalog}
                disabled={importing}
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Import en cours…" : "Importer le catalogue"}
              </button>
              {importResult && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-100">
                  <p className="font-medium">{importResult.imported} produit{importResult.imported > 1 ? "s" : ""} importé{importResult.imported > 1 ? "s" : ""} / mis à jour.</p>
                  {importResult.items.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-0.5">
                      {importResult.items.map((item) => (
                        <li key={item.productSlug}>
                          {item.productName} — {formatPrice(item.price, "EUR")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </>
        )}

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

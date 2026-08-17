"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getAdminOrders, downloadInvoicePdf, resolveAdminOrder, AdminOrder, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL as STATUS_LABEL } from "@/lib/orderStatus";

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAdminOrders(token)
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownload(order: AdminOrder) {
    if (!token || !order.invoice) return;
    setDownloadingId(order.id);
    try {
      await downloadInvoicePdf(token, order.id, `${order.invoice.number}.pdf`);
    } catch {
      setError("Téléchargement de la facture impossible.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleResolve(order: AdminOrder, status: "CONFIRMED" | "FAILED") {
    if (!token) return;
    setResolvingId(order.id);
    setError(null);
    try {
      const updated = await resolveAdminOrder(token, order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setConfirmingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Résolution manuelle impossible.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <AdminGuard scope="ORDERS">
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-1 font-serif text-3xl text-stone-900">Commandes</h1>
        <p className="mb-6 text-stone-500">Toutes les commandes de la plateforme, tous clients confondus.</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Produit</th>
                  <th className="p-3 font-medium">Fournisseur</th>
                  <th className="p-3 font-medium">Client</th>
                  <th className="p-3 font-medium">Montant</th>
                  <th className="p-3 font-medium">Commission</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Facture</th>
                  <th className="p-3 font-medium">Intervention manuelle</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-stone-50 last:border-0">
                    <td className="p-3 text-stone-500">{formatDate(o.createdAt)}</td>
                    <td className="p-3 font-medium text-stone-900">{o.product.name}</td>
                    <td className="p-3 text-stone-600">{o.provider.name}</td>
                    <td className="p-3 text-stone-600">{o.user.email}</td>
                    <td className="p-3 text-stone-900">{formatPrice(o.amount, o.currency)}</td>
                    <td className="p-3 text-stone-600">{formatPrice(o.platformFee, o.currency)}</td>
                    <td className="p-3 text-stone-500">{STATUS_LABEL[o.status]}</td>
                    <td className="p-3">
                      {o.invoice ? (
                        <button
                          onClick={() => handleDownload(o)}
                          disabled={downloadingId === o.id}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadingId === o.id ? "…" : o.invoice.number}
                        </button>
                      ) : (
                        <span className="text-sm text-stone-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {o.status !== "PENDING" ? (
                        <span className="text-sm text-stone-400">—</span>
                      ) : confirmingId === o.id ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xs text-stone-500">Confirmer ?</span>
                          <button
                            onClick={() => handleResolve(o, "CONFIRMED")}
                            disabled={resolvingId === o.id}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Réussie
                          </button>
                          <button
                            onClick={() => handleResolve(o, "FAILED")}
                            disabled={resolvingId === o.id}
                            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Échec
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={resolvingId === o.id}
                            className="text-sm text-stone-400 hover:text-stone-600"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(o.id)}
                          className="text-sm font-medium text-stone-700 underline decoration-dotted hover:text-stone-900"
                        >
                          Résoudre…
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-stone-400">Aucune commande.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}

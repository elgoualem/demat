"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getAdminOrders, AdminOrder, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";

const STATUS_LABEL: Record<AdminOrder["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  FAILED: "Échouée",
  REFUNDED: "Remboursée",
  EXPIRED: "Expirée",
};

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAdminOrders(token)
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AdminGuard>
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
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-stone-400">Aucune commande.</td>
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

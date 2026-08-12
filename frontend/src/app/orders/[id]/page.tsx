"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrder, Order, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_META: Record<Order["status"], { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-stone-100 text-stone-700" },
  CONFIRMED: { label: "Confirmée", className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100" },
  FAILED: { label: "Échouée", className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100" },
  REFUNDED: { label: "Remboursée", className: "bg-stone-100 text-stone-700" },
  EXPIRED: { label: "Expirée", className: "bg-stone-100 text-stone-700" },
};

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function OrderPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setOrder(await getOrder(token, params.id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchOrder();
  }, [token, fetchOrder, router]);

  if (loading && !order) return <p className="text-stone-500">Chargement de la commande…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!order) return null;

  const status = STATUS_META[order.status];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">{order.product?.name ?? `Commande ${order.id.slice(0, 8)}`}</h1>
          <p className="mt-1 text-stone-500">
            {formatPrice(order.amount, order.currency)}
            {order.provider && <span className="text-stone-400"> · {order.provider.name}</span>}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>{status.label}</span>
      </div>

      {order.invoice && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-stone-900">Facture</h2>
          <p className="text-sm text-stone-600">Statut : {order.invoice.status}</p>
          <p className="text-sm text-stone-600">Émise le : {new Date(order.invoice.issuedAt).toLocaleString("fr-FR")}</p>
        </div>
      )}

      {order.events && order.events.length > 0 && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-stone-900">Historique</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {order.events.map((event) => (
              <li key={event.id} className="flex gap-2">
                <span className="text-stone-400">{new Date(event.createdAt).toLocaleTimeString("fr-FR")}</span>
                <span className="text-stone-700">{event.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={fetchOrder}
        disabled={loading}
        className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Actualiser
      </button>
    </div>
  );
}

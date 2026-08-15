"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrders, Order, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function OrdersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setOrders(await getOrders(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [token, fetchOrders, router]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Mes commandes</h1>
      <p className="mb-8 text-stone-500">Historique complet de vos achats, tous services confondus.</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-stone-500">Chargement…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-stone-500">Vous n&apos;avez pas encore passé de commande.</p>
          <Link
            href="/services"
            className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Découvrir les services
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">
                    {order.product?.name ?? `Commande ${order.id.slice(0, 8)}`}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}
                    {formatPrice(order.amount, order.currency)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status]}`}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

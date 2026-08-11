"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrder, Order, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_LABEL: Record<Order["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  FAILED: "Échouée",
  REFUNDED: "Remboursée",
  EXPIRED: "Expirée",
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

  if (loading && !order) return <p>Chargement de la commande…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!order) return null;

  return (
    <div className="order-page">
      <h1>Commande {order.id.slice(0, 8)}</h1>
      <p>
        Statut : <strong className={`status status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</strong>
      </p>
      <p>Montant : {formatPrice(order.amount, order.currency)}</p>

      {order.invoice && (
        <div className="card">
          <h2>Facture</h2>
          <p>Statut : {order.invoice.status}</p>
          <p>Émise le : {new Date(order.invoice.issuedAt).toLocaleString("fr-FR")}</p>
        </div>
      )}

      {order.events && order.events.length > 0 && (
        <div>
          <h2>Historique</h2>
          <ul className="events">
            {order.events.map((event) => (
              <li key={event.id}>
                <span className="muted">{new Date(event.createdAt).toLocaleTimeString("fr-FR")}</span> — {event.type}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={fetchOrder} disabled={loading}>
        Actualiser
      </button>
    </div>
  );
}

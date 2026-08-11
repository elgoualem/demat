"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getServices, createOrder, Service, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(() => setError("Impossible de charger le catalogue."))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return <p>Chargement du catalogue…</p>;

  return (
    <div>
      <h1>Catalogue</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {services.map((service) => (
          <div key={service.id} className="card">
            <h2>{service.name}</h2>
            <p className="muted">{service.provider.name}</p>
            <p>{service.description}</p>
            <p className="price">{formatPrice(service.price, service.currency)}</p>
            <button onClick={() => handleOrder(service.id)} disabled={orderingId === service.id}>
              {orderingId === service.id ? "Commande en cours…" : "Commander"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

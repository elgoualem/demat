"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProduct, createOrder, listOrganizations, ProductDetail, Organization, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getCategoryMeta } from "@/lib/categories";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

function formatDelivery(seconds: number | null) {
  if (seconds === null) return null;
  if (seconds < 60) return `livré en ${seconds} s`;
  return `livré en ${Math.round(seconds / 60)} min`;
}

export default function ProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [buyingAs, setBuyingAs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);

  useEffect(() => {
    getProduct(params.slug)
      .then(setProduct)
      .catch(() => setError("Impossible de charger ce produit."))
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (token) listOrganizations(token).then(setOrgs).catch(() => {});
    else setOrgs([]);
  }, [token]);

  async function handleChoose(offerId: string) {
    if (!token) {
      router.push("/login");
      return;
    }
    setChoosingId(offerId);
    setError(null);
    try {
      const order = await createOrder(token, offerId, buyingAs || null);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
      setChoosingId(null);
    }
  }

  if (loading) return <p className="text-stone-500">Chargement…</p>;
  if (error && !product) return <p className="text-sm text-red-600">{error}</p>;
  if (!product) return null;

  const meta = getCategoryMeta(product.category);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Catalogue
      </Link>

      <span className={`mb-3 w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
        {meta.emoji} {meta.label}
      </span>
      <h1 className="mt-2 font-serif text-3xl text-stone-900">{product.name}</h1>
      <p className="mt-2 text-stone-500">{product.description}</p>
      <p className="mt-1 text-sm text-stone-400">
        {product.offers.length} fournisseur{product.offers.length > 1 ? "s" : ""} proposent ce produit. Classés par prix.
      </p>

      {orgs.length > 0 && (
        <label className="mt-6 flex w-fit items-center gap-2 text-sm">
          <span className="font-medium text-stone-700">Commander pour :</span>
          <select
            value={buyingAs}
            onChange={(e) => setBuyingAs(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Moi-même</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {product.offers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                {offer.provider.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-stone-900">{offer.provider.name}</p>
                <p className="text-xs text-stone-500">
                  {offer.rating !== null && `${offer.rating.toFixed(1)} ★ · `}
                  {offer.salesCount.toLocaleString("fr-FR")} ventes
                  {offer.kycVerified && " · KYC vérifié"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-stone-900">{formatPrice(offer.price, product.currency)}</p>
                {formatDelivery(offer.deliverySeconds) && (
                  <p className="text-xs text-stone-400">{formatDelivery(offer.deliverySeconds)}</p>
                )}
              </div>
              <button
                onClick={() => handleChoose(offer.id)}
                disabled={choosingId === offer.id}
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {choosingId === offer.id ? "…" : "Choisir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listOrganizations, Organization, CheckoutResult, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

export default function CartPage() {
  const { token } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [buyingAs, setBuyingAs] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    cart.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirection au montage, pas à chaque changement de token
  }, [token, router]);

  useEffect(() => {
    if (token) listOrganizations(token).then(setOrgs).catch(() => {});
    else setOrgs([]);
  }, [token]);

  async function handleUpdateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    setError(null);
    try {
      await cart.updateQuantity(id, quantity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await cart.remove(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    }
  }

  async function handleCheckout() {
    setCheckingOut(true);
    setError(null);
    try {
      setResult(await cart.checkout(buyingAs || undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setCheckingOut(false);
    }
  }

  if (!token) return null;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-3xl text-stone-900">Récapitulatif</h1>
        <p className="mb-8 text-stone-500">
          {result.orders.length} commande{result.orders.length > 1 ? "s" : ""} créée{result.orders.length > 1 ? "s" : ""}, une par
          fournisseur.
        </p>

        {result.skipped.length > 0 && (
          <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
            {result.skipped.map((s, i) => (
              <p key={i}>
                « {s.productName} » n&apos;était plus disponible et a été retiré de votre panier.
              </p>
            ))}
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {result.orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{order.product?.name ?? `Commande ${order.id.slice(0, 8)}`}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {order.provider?.name} · {formatPrice(order.amount, order.currency)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status]}`}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/orders"
          className="mt-8 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Voir mes commandes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-serif text-3xl text-stone-900">Panier</h1>
      <p className="mb-8 text-stone-500">Regroupez plusieurs produits, même de fournisseurs différents, en un seul checkout.</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {cart.loading ? (
        <p className="text-stone-500">Chargement…</p>
      ) : cart.items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-stone-500">Votre panier est vide.</p>
          <Link
            href="/services"
            className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Découvrir les services
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <Link href={`/products/${item.product.slug}`} className="truncate font-semibold text-stone-900 hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-stone-500">{item.offer.provider.name}</p>
                  {!item.available && <p className="mt-1 text-xs text-red-600">Cette offre n&apos;est plus disponible.</p>}
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  {item.available && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Diminuer la quantité"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm text-stone-900">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        aria-label="Augmenter la quantité"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <p className="w-20 text-right font-bold text-stone-900">
                    {item.available ? formatPrice(item.subtotal, item.product.currency) : "—"}
                  </p>
                  <button
                    onClick={() => handleRemove(item.id)}
                    aria-label="Retirer du panier"
                    className="text-sm font-medium text-stone-400 hover:text-red-600"
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>

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

          <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6">
            <div>
              <p className="text-sm text-stone-500">Total</p>
              <p className="text-2xl font-bold text-stone-900">
                {formatPrice(cart.total, cart.items[0]?.product.currency ?? "EUR")}
              </p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut || !cart.items.some((i) => i.available)}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingOut ? "…" : "Valider la commande"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

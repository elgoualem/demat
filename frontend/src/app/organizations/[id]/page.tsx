"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getOrganization,
  getOrganizationOrders,
  addOrganizationMember,
  removeOrganizationMember,
  Organization,
  Order,
  MembershipRole,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = { OWNER: "Propriétaire", ADMIN: "Admin", MEMBER: "Membre" };
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

export default function OrganizationPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("MEMBER");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [orgData, orderData] = await Promise.all([
        getOrganization(token, params.id),
        getOrganizationOrders(token, params.id),
      ]);
      setOrg(orgData);
      setOrders(orderData);
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
    load();
  }, [token, load, router]);

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setMemberError(null);
    try {
      await addOrganizationMember(token, params.id, email, role);
      setEmail("");
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setMemberError("Aucun compte avec cet email.");
      else if (err instanceof ApiError && err.status === 409) setMemberError("Déjà membre de l'organisation.");
      else setMemberError("Impossible d'ajouter ce membre.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!token) return;
    try {
      await removeOrganizationMember(token, params.id, userId);
      await load();
    } catch {
      setMemberError("Impossible de retirer ce membre.");
    }
  }

  if (loading && !org) return <p className="text-stone-500">Chargement…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!org) return null;

  const canManage = org.role === "OWNER" || org.role === "ADMIN";

  return (
    <div>
      <Link href="/organizations" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Organisations
      </Link>
      <h1 className="mb-1 font-serif text-3xl text-stone-900">{org.name}</h1>
      {org.vatNumber && <p className="mb-6 text-sm text-stone-500">{org.vatNumber}</p>}

      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-stone-900">Membres</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {org.memberships?.map((m) => (
            <li key={m.user.id} className="flex items-center justify-between text-sm">
              <span className="text-stone-700">
                {m.user.email} {m.user.id === user?.id && <span className="text-stone-400">(toi)</span>}
              </span>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {ROLE_LABEL[m.role]}
                </span>
                {canManage && m.role !== "OWNER" && (
                  <button onClick={() => handleRemove(m.user.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Retirer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canManage && (
          <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-3 border-t border-stone-100 pt-4">
            <label className="flex flex-1 min-w-[180px] flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Rôle</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MembershipRole)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="MEMBER">Membre</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Ajout…" : "Ajouter"}
            </button>
          </form>
        )}
        {memberError && <p className="mt-2 text-sm text-red-600">{memberError}</p>}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-stone-900">Commandes de l&apos;organisation</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">Aucune commande passée pour le compte de l&apos;organisation.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-stone-50"
                >
                  <span className="text-stone-700">
                    {order.product?.name ?? order.id.slice(0, 8)} — {order.user?.email}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-stone-500">{formatPrice(order.amount, order.currency)}</span>
                    <span className="text-stone-400">{STATUS_LABEL[order.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

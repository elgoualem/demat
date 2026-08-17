"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getCommissionsReport, CommissionsReport, ApiError, AdminScope } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

const SECTIONS: { href: string; label: string; description: string; scope: AdminScope }[] = [
  { href: "/admin/analytics", label: "Analytique", description: "Chiffre d'affaires et commission par fournisseur, comparés dans le temps", scope: "ANALYTICS" },
  { href: "/admin/providers", label: "Fournisseurs", description: "Commissions, statut, connecteur", scope: "PROVIDERS" },
  { href: "/admin/products", label: "Produits", description: "Catalogue, offres par fournisseur", scope: "CATALOG" },
  { href: "/admin/orders", label: "Commandes", description: "Toutes les commandes, tous clients", scope: "ORDERS" },
  { href: "/admin/users", label: "Comptes", description: "Gérer les accès au back-office", scope: "USERS" },
];

export default function AdminOverviewPage() {
  const { token, user } = useAuth();
  const canSeeCommissions = !!user?.adminScopes?.includes("COMMISSIONS");
  const visibleSections = SECTIONS.filter((s) => user?.adminScopes?.includes(s.scope));
  const [report, setReport] = useState<CommissionsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(canSeeCommissions);

  useEffect(() => {
    if (!token || !canSeeCommissions) return;
    getCommissionsReport(token)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [token, canSeeCommissions]);

  return (
    <AdminGuard>
      <div>
        <h1 className="mb-1 font-serif text-3xl text-stone-900">Tableau de bord</h1>
        <p className="mb-8 text-stone-500">Vue réservée aux administrateurs de la plateforme.</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!canSeeCommissions ? null : loading ? (
          <p className="mb-8 text-stone-500">Chargement des revenus…</p>
        ) : report ? (
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-stone-400">Commission totale (commandes confirmées)</p>
              <p className="mt-1 font-serif text-3xl text-stone-900">{formatPrice(report.totalCommission, "EUR")}</p>
              <p className="mt-1 text-sm text-stone-500">{report.orderCount} commande{report.orderCount > 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs text-stone-400">Par fournisseur</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {report.byProvider.map((p) => (
                  <li key={p.providerId} className="flex items-center justify-between">
                    <span className="text-stone-700">{p.providerName}</span>
                    <span className="text-stone-500">
                      {formatPrice(p.totalCommission, "EUR")} · {p.orderCount} cmd
                    </span>
                  </li>
                ))}
                {report.byProvider.length === 0 && <li className="text-stone-400">Aucune commande confirmée pour l&apos;instant.</li>}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {visibleSections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="font-semibold text-stone-900">{s.label}</p>
              <p className="text-sm text-stone-500">{s.description}</p>
            </Link>
          ))}
          {visibleSections.length === 0 && (
            <p className="text-stone-400">Aucun accès accordé pour l&apos;instant — demande à un administrateur de t&apos;attribuer des sections.</p>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

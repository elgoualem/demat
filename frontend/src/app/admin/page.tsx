"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getCommissionsReport, CommissionsReport, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

const SECTIONS = [
  { href: "/admin/analytics", label: "Analytique", description: "Chiffre d'affaires et commission par fournisseur, comparés dans le temps" },
  { href: "/admin/providers", label: "Fournisseurs", description: "Commissions, statut, connecteur" },
  { href: "/admin/products", label: "Produits", description: "Catalogue, offres par fournisseur" },
  { href: "/admin/orders", label: "Commandes", description: "Toutes les commandes, tous clients" },
  { href: "/admin/users", label: "Comptes", description: "Promouvoir ou révoquer des admins" },
];

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<CommissionsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getCommissionsReport(token)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AdminGuard>
      <div>
        <h1 className="mb-1 font-serif text-3xl text-stone-900">Tableau de bord</h1>
        <p className="mb-8 text-stone-500">Vue réservée aux administrateurs de la plateforme.</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
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
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="font-semibold text-stone-900">{s.label}</p>
              <p className="text-sm text-stone-500">{s.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}

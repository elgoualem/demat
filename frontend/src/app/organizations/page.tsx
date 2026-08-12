"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listOrganizations, createOrganization, Organization, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = { OWNER: "Propriétaire", ADMIN: "Admin", MEMBER: "Membre" };

export default function OrganizationsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    listOrganizations(token)
      .then(setOrgs)
      .catch(() => setError("Impossible de charger les organisations."))
      .finally(() => setLoading(false));
  }, [token, router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const org = await createOrganization(token, name, vatNumber || undefined);
      setOrgs((prev) => [...prev, { ...org, role: "OWNER" }]);
      setName("");
      setVatNumber("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-stone-900">Organisations</h1>

      {loading ? (
        <p className="text-stone-500">Chargement…</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {orgs.length === 0 && <p className="text-stone-500">Tu n&apos;appartiens à aucune organisation pour l&apos;instant.</p>}
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.id}`}
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-stone-900">{org.name}</p>
                {org.vatNumber && <p className="text-sm text-stone-500">{org.vatNumber}</p>}
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                {org.role ? ROLE_LABEL[org.role] : ""}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-stone-900">Créer une organisation</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">Nom</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">N° TVA (optionnel)</span>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Création…" : "Créer"}
          </button>
        </form>
      </div>
    </div>
  );
}

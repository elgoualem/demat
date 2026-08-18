"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import {
  getAdminUsers,
  updateAdminUser,
  updateAdminUserPermissions,
  AdminUser,
  AdminScope,
  AdminPermissionGrant,
  ADMIN_SCOPES,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const DURATIONS: { value: string; label: string; days: number | null }[] = [
  { value: "", label: "Permanent", days: null },
  { value: "1", label: "1 jour (visiteur)", days: 1 },
  { value: "7", label: "7 jours", days: 7 },
  { value: "30", label: "30 jours", days: 30 },
  { value: "90", label: "90 jours", days: 90 },
];

function grantLabel(grant: AdminPermissionGrant) {
  const parts = [grant.readOnly ? "lecture seule" : "accès complet"];
  parts.push(grant.expiresAt ? `expire le ${formatDate(grant.expiresAt)}` : "permanent");
  return parts.join(" · ");
}

// Hors du composant : le calcul dépend de l'heure d'appel (Date.now), donc doit
// rester en dehors du corps du composant plutôt qu'être évalué au rendu.
function computeExpiresAt(days: number | null): string | null {
  if (!days) return null;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export default function AdminUsersPage() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ userId: string; scope: AdminScope } | null>(null);
  const [editReadOnly, setEditReadOnly] = useState(false);
  const [editDuration, setEditDuration] = useState("");

  useEffect(() => {
    if (!token) return;
    getAdminUsers(token)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [token]);

  async function toggleAdmin(u: AdminUser) {
    if (!token) return;
    setSavingId(u.id);
    setError(null);
    try {
      const updated = await updateAdminUser(token, u.id, !u.isAdmin);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? "Tu ne peux pas révoquer ton propre accès admin." : "Erreur inconnue");
    } finally {
      setSavingId(null);
    }
  }

  function openEditor(u: AdminUser, scope: AdminScope) {
    const existing = u.permissions.find((p) => p.scope === scope);
    setEditReadOnly(existing?.readOnly ?? false);
    setEditDuration("");
    setEditing({ userId: u.id, scope });
  }

  async function saveGrant(u: AdminUser) {
    if (!token || !editing) return;
    const duration = DURATIONS.find((d) => d.value === editDuration);
    const expiresAt = computeExpiresAt(duration?.days ?? null);
    const nextPermissions: AdminPermissionGrant[] = [
      ...u.permissions.filter((p) => p.scope !== editing.scope),
      { scope: editing.scope, readOnly: editReadOnly, expiresAt },
    ];
    await savePermissions(u, nextPermissions);
  }

  async function revokeGrant(u: AdminUser, scope: AdminScope) {
    await savePermissions(u, u.permissions.filter((p) => p.scope !== scope));
  }

  async function savePermissions(u: AdminUser, nextPermissions: AdminPermissionGrant[]) {
    if (!token) return;
    setSavingId(u.id);
    setError(null);
    try {
      const updated = await updateAdminUserPermissions(token, u.id, nextPermissions);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      setEditing(null);
    } catch {
      setError("Impossible de modifier ces accès.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminGuard scope="USERS">
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-1 font-serif text-3xl text-stone-900">Comptes</h1>
        <p className="mb-6 text-stone-500">
          Promouvoir un compte en admin lui ouvre le panneau ; clique sur une section pour l&apos;accorder — en lecture
          seule et/ou pour une durée limitée si tu veux n&apos;autoriser qu&apos;une simple consultation.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Inscrit le</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Accès aux sections</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-stone-50 last:border-0 align-top">
                      <td className="p-3 font-medium text-stone-900">
                        {u.email} {isSelf && <span className="text-stone-400">(toi)</span>}
                        {u.name && <div className="font-normal text-stone-500">{u.name}</div>}
                      </td>
                      <td className="p-3 text-stone-500">{formatDate(u.createdAt)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleAdmin(u)}
                          disabled={savingId === u.id || isSelf}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            u.isAdmin ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {u.isAdmin ? "Admin — révoquer" : "Promouvoir admin"}
                        </button>
                      </td>
                      <td className="p-3">
                        {!u.isAdmin ? (
                          <span className="text-stone-400">—</span>
                        ) : isSelf ? (
                          <span className="text-stone-400">Demande à un autre admin de modifier tes accès.</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {ADMIN_SCOPES.map(({ value, label }) => {
                                const grant = u.permissions.find((p) => p.scope === value);
                                return (
                                  <button
                                    key={value}
                                    onClick={() => openEditor(u, value)}
                                    disabled={savingId === u.id}
                                    title={grant ? `${label} — ${grantLabel(grant)}` : label}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                      grant
                                        ? grant.readOnly
                                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                          : "bg-brand-600 text-white hover:bg-brand-700"
                                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                                    }`}
                                  >
                                    {label}
                                    {grant?.readOnly && " 👁"}
                                  </button>
                                );
                              })}
                            </div>

                            {editing?.userId === u.id && (
                              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs">
                                <span className="font-medium text-stone-700">
                                  {ADMIN_SCOPES.find((s) => s.value === editing.scope)?.label} :
                                </span>
                                <label className="flex items-center gap-1.5 text-stone-600">
                                  <input type="checkbox" checked={editReadOnly} onChange={(e) => setEditReadOnly(e.target.checked)} />
                                  Lecture seule (visiteur)
                                </label>
                                <select
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="rounded-lg border border-stone-300 bg-white px-2 py-1"
                                >
                                  {DURATIONS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => saveGrant(u)}
                                  disabled={savingId === u.id}
                                  className="rounded-full bg-brand-600 px-3 py-1 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Accorder
                                </button>
                                {u.permissions.some((p) => p.scope === editing.scope) && (
                                  <button
                                    onClick={() => revokeGrant(u, editing.scope)}
                                    disabled={savingId === u.id}
                                    className="rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Retirer l&apos;accès
                                  </button>
                                )}
                                <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-600">
                                  Annuler
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-stone-400">Aucun compte.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}

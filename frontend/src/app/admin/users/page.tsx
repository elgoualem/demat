"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { getAdminUsers, updateAdminUser, AdminUser, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  return (
    <AdminGuard>
      <div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700">
          ← Tableau de bord
        </Link>
        <h1 className="mb-6 font-serif text-3xl text-stone-900">Comptes</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-stone-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-400">
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Inscrit le</th>
                  <th className="p-3 font-medium">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-stone-50 last:border-0">
                    <td className="p-3 font-medium text-stone-900">
                      {u.email} {u.id === me?.id && <span className="text-stone-400">(toi)</span>}
                    </td>
                    <td className="p-3 text-stone-600">{u.name ?? "—"}</td>
                    <td className="p-3 text-stone-500">{formatDate(u.createdAt)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleAdmin(u)}
                        disabled={savingId === u.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          u.isAdmin ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {u.isAdmin ? "Admin — révoquer" : "Promouvoir admin"}
                      </button>
                    </td>
                  </tr>
                ))}
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

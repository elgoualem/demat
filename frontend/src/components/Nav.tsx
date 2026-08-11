"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Démat
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/organizations" className="font-medium text-slate-700 hover:text-slate-900">
                Organisations
              </Link>
              <span className="text-slate-500">{user.email}</span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white transition hover:bg-brand-700"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

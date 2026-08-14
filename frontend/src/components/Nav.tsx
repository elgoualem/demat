"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-10 border-b border-stone-200 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight text-stone-900">
          Démat
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
          <Link href="/#categories" className="hover:text-stone-900">
            Catégories
          </Link>
          <Link href="/#comment-ca-marche" className="hover:text-stone-900">
            Comment ça marche
          </Link>
          <Link href="/#catalogue" className="hover:text-stone-900">
            Catalogue
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/organizations" className="font-medium text-stone-700 hover:text-stone-900">
                Organisations
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="font-medium text-brand-600 hover:text-brand-700">
                  Admin
                </Link>
              )}
              <span className="text-stone-500">{user.email}</span>
              <button
                onClick={logout}
                className="rounded-full border border-stone-300 px-3 py-1.5 font-medium text-stone-700 transition hover:bg-stone-100"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-stone-700 hover:text-stone-900">
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand-600 px-3.5 py-1.5 font-medium text-white transition hover:bg-brand-700"
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

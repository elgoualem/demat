"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getCategories, CategoryTreeNode } from "@/lib/api";

export default function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/?q=${encodeURIComponent(search.trim())}#catalogue`);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-stone-200 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0 whitespace-nowrap font-serif text-2xl tracking-tight text-stone-900">
          DigiGo
        </Link>

        {/* Navigation desktop */}
        <div className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium text-stone-600 md:flex">
          <div ref={categoriesRef} className="relative">
            <button
              onClick={() => setCategoriesOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-stone-900"
              aria-expanded={categoriesOpen}
            >
              Catégories
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {categoriesOpen && categories.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/services/${c.slug}`}
                    onClick={() => setCategoriesOpen(false)}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-stone-700 hover:bg-stone-50"
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                    </span>
                    <span className="text-xs text-stone-400">{c.productCount}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/#comment-ca-marche" className="hover:text-stone-900">
            Comment ça marche
          </Link>
          <Link href="/#catalogue" className="hover:text-stone-900">
            Catalogue
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Recherche desktop */}
          <div className="relative hidden md:block">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  autoFocus
                  type="search"
                  aria-label="Rechercher un produit"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => !search && setSearchOpen(false)}
                  placeholder="Rechercher…"
                  className="w-48 rounded-full border border-stone-300 bg-white py-1.5 pl-3 pr-8 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Rechercher"
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
              </button>
            )}
          </div>

          <div className="hidden items-center gap-2 whitespace-nowrap text-sm sm:flex sm:gap-3">
            {user ? (
              <>
                <Link href="/orders" className="font-medium text-stone-700 hover:text-stone-900">
                  Mes commandes
                </Link>
                <Link href="/organizations" className="hidden font-medium text-stone-700 hover:text-stone-900 lg:inline">
                  Organisations
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className="font-medium text-brand-600 hover:text-brand-700">
                    Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="shrink-0 rounded-full border border-stone-300 px-2.5 py-1.5 font-medium text-stone-700 transition hover:bg-stone-100 sm:px-3"
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

          {/* Bouton menu mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 sm:hidden"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Panneau mobile */}
      {mobileOpen && (
        <div className="border-t border-stone-200 bg-cream px-6 py-4 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
            </svg>
            <input
              type="search"
              aria-label="Rechercher un produit"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-full border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </form>

          {categories.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-stone-400 uppercase">Catégories</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/services/${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-2 text-sm font-medium text-stone-600">
            <Link href="/#comment-ca-marche" onClick={() => setMobileOpen(false)}>
              Comment ça marche
            </Link>
            <Link href="/#catalogue" onClick={() => setMobileOpen(false)}>
              Catalogue
            </Link>
          </div>

          <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 text-sm">
            {user ? (
              <>
                <Link href="/orders" onClick={() => setMobileOpen(false)} className="font-medium text-stone-700">
                  Mes commandes
                </Link>
                <Link href="/organizations" onClick={() => setMobileOpen(false)} className="font-medium text-stone-700">
                  Organisations
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="font-medium text-brand-600">
                    Admin
                  </Link>
                )}
                <button onClick={logout} className="w-fit rounded-full border border-stone-300 px-3 py-1.5 font-medium text-stone-700">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="font-medium text-stone-700">
                  Connexion
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-fit rounded-full bg-brand-600 px-3.5 py-1.5 font-medium text-white"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

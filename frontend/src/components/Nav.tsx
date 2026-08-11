"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        Marketplace
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-user">{user.email}</span>
            <button onClick={logout}>Déconnexion</button>
          </>
        ) : (
          <>
            <Link href="/login">Connexion</Link>
            <Link href="/register">Inscription</Link>
          </>
        )}
      </div>
    </nav>
  );
}

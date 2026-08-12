"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Protège les pages /admin/* : redirige les comptes non-admin (ou non connectés)
// vers l'accueil. Le backend applique le même contrôle sur chaque route /admin —
// ce garde n'est qu'un confort d'UX, jamais la seule barrière.
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user?.isAdmin) router.push("/");
  }, [user, router]);

  if (!user?.isAdmin) return null;
  return <>{children}</>;
}

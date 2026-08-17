"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AdminScope } from "@/lib/api";

// Protège les pages /admin/* : redirige les comptes non-admin (ou non connectés),
// ou n'ayant pas le scope requis pour cette section, vers l'accueil. Le backend
// applique le même contrôle sur chaque route /admin — ce garde n'est qu'un
// confort d'UX, jamais la seule barrière (voir AdminScope dans schema.prisma).
export default function AdminGuard({ children, scope }: { children: React.ReactNode; scope?: AdminScope }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = !!user?.isAdmin && (!scope || user.adminScopes?.includes(scope));

  useEffect(() => {
    if (!allowed) router.push("/");
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}

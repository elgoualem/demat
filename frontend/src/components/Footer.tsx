import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-2 max-w-xs text-sm text-stone-500">Rechargez. Payez. Voyagez.</p>
        </div>

        <div className="flex flex-wrap gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-stone-900">Plateforme</span>
            <Link href="/services" className="text-stone-500 hover:text-stone-900">
              Tous les services
            </Link>
            <Link href="/#catalogue" className="text-stone-500 hover:text-stone-900">
              Catalogue
            </Link>
            <Link href="/register" className="text-stone-500 hover:text-stone-900">
              Créer un compte
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-stone-900">Compte</span>
            <Link href="/login" className="text-stone-500 hover:text-stone-900">
              Connexion
            </Link>
            <Link href="/organizations" className="text-stone-500 hover:text-stone-900">
              Organisations
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-100 px-6 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} DigiGo. Place de marché vérifiée.
      </div>
    </footer>
  );
}

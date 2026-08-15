import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://frontend-production-ec1f.up.railway.app";
const DEFAULT_TITLE = "DigiGo | Recharges, cartes prépayées, voyages et assurances";
const DEFAULT_DESCRIPTION =
  "DigiGo simplifie vos recharges téléphoniques, cartes prépayées, billets de voyage, assurances et services numériques.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: "DigiGo",
    url: "/",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Nav />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

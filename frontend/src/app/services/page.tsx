import type { Metadata } from "next";
import ServicesPageClient from "./ServicesPageClient";

const title = "Tous les services | DigiGo";
const description =
  "Recharges, argent, cartes prépayées, voyages, assurances et factures — parcourez le catalogue complet par catégorie.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/services" },
  openGraph: {
    title,
    description,
    url: "/services",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

export default function ServicesPage() {
  return <ServicesPageClient />;
}

import type { Metadata } from "next";
import CategoryPageClient from "./CategoryPageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  try {
    const res = await fetch(`${API_URL}/categories`, { cache: "no-store" });
    if (!res.ok) return { title: "DigiGo" };
    const categories: Array<{ slug: string; name: string }> = await res.json();
    const category = categories.find((c) => c.slug === slug);
    if (!category) return { title: "Catégorie introuvable | DigiGo" };
    const title = `${category.name} | DigiGo`;
    const description = `Comparez les offres ${category.name.toLowerCase()} de fournisseurs vérifiés sur DigiGo.`;
    return {
      title,
      description,
      alternates: { canonical: `/services/${slug}` },
      openGraph: {
        title,
        description,
        url: `/services/${slug}`,
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
  } catch {
    return { title: "DigiGo" };
  }
}

export default function CategoryPage() {
  return <CategoryPageClient />;
}

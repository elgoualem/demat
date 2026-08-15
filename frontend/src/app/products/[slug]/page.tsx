import type { Metadata } from "next";
import ProductPageClient from "./ProductPageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return { title: "Produit introuvable | DigiGo" };
    const product = await res.json();
    const title = `${product.name} | DigiGo`;
    const images = product.imageUrl ? [product.imageUrl] : ["/opengraph-image"];
    return {
      title,
      description: product.description,
      alternates: { canonical: `/products/${slug}` },
      openGraph: {
        title,
        description: product.description,
        url: `/products/${slug}`,
        type: "website",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: product.description,
        images,
      },
    };
  } catch {
    return { title: "DigiGo" };
  }
}

export default function ProductPage() {
  return <ProductPageClient />;
}

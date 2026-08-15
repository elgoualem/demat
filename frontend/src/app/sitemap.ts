import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://frontend-production-ec1f.up.railway.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface CategorySummary {
  slug: string;
}

interface ProductSummary {
  slug: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/services`, changeFrequency: "daily", priority: 0.9 },
  ];

  let categoryEntries: MetadataRoute.Sitemap = [];
  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${API_URL}/categories`, { cache: "no-store" }),
      fetch(`${API_URL}/products`, { cache: "no-store" }),
    ]);

    if (categoriesRes.ok) {
      const categories: CategorySummary[] = await categoriesRes.json();
      categoryEntries = categories.map((category) => ({
        url: `${SITE_URL}/services/${category.slug}`,
        changeFrequency: "daily",
        priority: 0.8,
      }));
    }

    if (productsRes.ok) {
      const products: ProductSummary[] = await productsRes.json();
      productEntries = products.map((product) => ({
        url: `${SITE_URL}/products/${product.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      }));
    }
  } catch {
    // Le backend est indisponible : on retombe sur les entrées statiques ci-dessus.
  }

  return [...staticEntries, ...categoryEntries, ...productEntries];
}

import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://frontend-production-ec1f.up.railway.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/orders", "/organizations"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

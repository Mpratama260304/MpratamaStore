import { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/base-url"

export default function robots(): MetadataRoute.Robots {
  // Note: robots.ts doesn't have access to request headers
  // so it uses env-based or fallback URL
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/order/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

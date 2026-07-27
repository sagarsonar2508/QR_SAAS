import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/qr-image";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private app surface + redirect/utility endpoints.
        disallow: [
          "/api/",
          "/dashboard",
          "/qrcodes",
          "/restaurant",
          "/billing",
          "/print/",
          "/files/",
          "/f/",
        ],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}

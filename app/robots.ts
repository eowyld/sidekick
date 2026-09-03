import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/", "/blog/*"],
        disallow: [
          "/api/",
          "/dashboard",
          "/tasks",
          "/calendar",
          "/contacts",
          "/phono",
          "/edition",
          "/live",
          "/marketing",
          "/incomes",
          "/admin",
          "/settings",
          "/projects",
          "/login",
          "/inscription",
          "/auth",
          "/presskit",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidekick.app";

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
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

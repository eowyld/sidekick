import path from "path";
import { fileURLToPath } from "url";
import createMDX from "@next/mdx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX({
  extension: /\.mdx$/
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname)
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/documents", destination: "/admin/documents", permanent: false },
      { source: "/drive", destination: "/admin/documents", permanent: false },
      {
        source: "/sidekick-landing.html",
        destination: "/?early-access=1",
        permanent: false
      }
    ];
  }
};

export default withMDX(nextConfig);

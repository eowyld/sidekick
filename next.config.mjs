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
  // L'indicateur de dev (pastille « N » en bas à gauche) est déjà absent des
  // builds de prod ; on le coupe aussi en dev pour qu'il ne pollue pas les
  // captures produit générées par scripts/shots.mjs (qui tourne sur `next dev`).
  devIndicators: false,
  // Les captures produit de la landing sont servies en quality 90 (ProductShot).
  images: { qualities: [75, 90] },
  turbopack: {
    root: path.resolve(__dirname)
  },
  skipTrailingSlashRedirect: true,
  // `ffmpeg-static` déduit le chemin de son binaire de `__dirname`. Bundlé, ce
  // `__dirname` est réécrit en un jeton `/ROOT/` et le spawn échoue en ENOENT.
  // Le laisser externe préserve un `require` réel depuis `node_modules`.
  serverExternalPackages: ["ffmpeg-static"],
  // `ffmpeg-static` construit le chemin de son binaire à l'exécution
  // (`path.join(__dirname, "ffmpeg")`), ce que l'analyse statique de Next ne
  // voit pas : sans cette ligne, la fonction part en production sans son
  // binaire. Ça ne concerne que cette route, les autres ne l'embarquent pas.
  outputFileTracingIncludes: {
    "/api/phono/apply-metadata": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
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
      { source: "/documents", destination: "/drive", permanent: false },
      { source: "/admin/documents", destination: "/drive", permanent: false },
      {
        source: "/sidekick-landing.html",
        destination: "/?early-access=1",
        permanent: false
      }
    ];
  }
};

export default withMDX(nextConfig);

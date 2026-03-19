import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname)
  },
  async redirects() {
    return [
      { source: "/documents", destination: "/admin/documents", permanent: false },
      { source: "/drive", destination: "/admin/documents", permanent: false }
    ];
  }
};

export default nextConfig;

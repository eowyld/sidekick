import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Archivo } from "next/font/google";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * Police unique du produit — landing, blog, auth, presskit et app interne.
 * Variable font : l'axe `wdth` permet la version large des titres (font-stretch)
 * sans charger une seconde famille.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const siteDescription =
  "SIDEKICK centralise phono, publishing, royalties, mailing, marketing, organisation de tournée, administration et facturation pour les artistes de musique indépendants.";

function getMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "SIDEKICK — Ta carrière musicale, un seul outil",
    template: "%s | SIDEKICK"
  },
  description: siteDescription,
  applicationName: "SIDEKICK",
  keywords: [
    "musique indépendante",
    "artiste",
    "manager",
    "tournée",
    "royalties",
    "publishing",
    "marketing musical"
  ],
  authors: [{ name: "SIDEKICK" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "SIDEKICK",
    title: "SIDEKICK — Ta carrière musicale, un seul outil",
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: "SIDEKICK — Ta carrière musicale, un seul outil",
    description: siteDescription
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  themeColor: "#101010",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={archivo.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
          <Toaster theme="dark" richColors position="bottom-right" />
        </PostHogProvider>
      </body>
    </html>
  );
}

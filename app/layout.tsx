import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

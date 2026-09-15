import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Archivo } from "next/font/google";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { CookieBanner } from "@/components/analytics/CookieBanner";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { Toaster } from "sonner";
import { SITE_URL } from "@/lib/site";
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

const siteTitle =
  "SIDEKICK — Gestion de carrière pour artistes musicaux indépendants";

const siteDescription =
  "Royalties, factures, SACEM, statuts, dates de concert et presskit dans un seul outil pensé pour les artistes indépendants français. Beatmaker, DJ, en groupe ou auteur-compositeur.";

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
    default: siteTitle,
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
    title: siteTitle,
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
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

/**
 * Données structurées valables sur tout le site : l'éditeur et le produit.
 * Le bloc `FAQPage` NE vit PAS ici — il n'est légitime que sur /faq, seule page
 * dont le contenu principal est cette FAQ (cf. `FaqJsonLd`).
 */
function SiteJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "SIDEKICK",
        url: SITE_URL,
        logo: `${SITE_URL}/images/sidekick-logo.png`,
        description:
          "Outil de gestion de carrière pour les artistes musicaux indépendants en France.",
        foundingDate: "2026",
        areaServed: { "@type": "Country", name: "France" }
        // sameAs : à ajouter dès que les profils publics (LinkedIn, Instagram,
        // TikTok) existent. On préfère l'absence à des URL inventées.
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "SIDEKICK",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
        publisher: { "@id": `${SITE_URL}/#organization` },
        description:
          "SIDEKICK réunit revenus, catalogue, dates de concert, démarches administratives et presskit des artistes musicaux indépendants français dans un seul espace, avec des modules reliés entre eux.",
        featureList: [
          "Suivi des revenus multi-sources",
          "Catalogue phonographique et catalogue d'œuvres",
          "Gestion des dates de concert et de tournée",
          "Statuts et démarches administratives françaises",
          "Facturation et note de frais",
          "Presskit"
        ],
        // PreOrder : rien n'est encaissé pendant l'alpha, mais le tarif
        // d'après-alpha est public. Retirer `offers` entièrement plutôt que
        // baliser un prix qu'on ne pratique pas encore serait aussi défendable.
        offers: {
          "@type": "Offer",
          price: "8.00",
          priceCurrency: "EUR",
          availability: "https://schema.org/PreOrder"
        }
      }
    ]
  };
  return (
    <script type="application/ld+json">{JSON.stringify(graph)}</script>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={archivo.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <SiteJsonLd />
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
          <CookieBanner />
          <Toaster theme="dark" richColors position="bottom-right" />
        </PostHogProvider>
      </body>
    </html>
  );
}

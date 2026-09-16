import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { FaqJsonLd, FaqSection } from "@/components/landing/FaqSection";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Ce qu'est SIDEKICK, en quoi il diffère de Notion, ce qui est gratuit, la gestion des statuts d'intermittent et d'auto-entrepreneur, le rapport à la SACEM — les réponses pour les artistes indépendants français.",
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#101010] text-[#f5f5f5]">
      <FaqJsonLd />

      <header className="sticky top-0 z-50 border-b border-[rgba(245,245,245,0.12)] bg-[#101010]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="SIDEKICK — accueil" className="shrink-0">
            <SidekickLogo className="h-10 w-auto" priority />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#f5f5f5]/60 transition-colors hover:text-[#F0FF00]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            FAQ
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">
            QUESTIONS FRÉQUENTES
          </h1>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Ce que fait SIDEKICK, ce qu&apos;il ne fait pas, et pour qui c&apos;est
            fait.
          </p>
        </div>

        <div className="mt-12">
          <FaqSection />
        </div>

        <div className="mt-14 rounded-sm border border-[#F0FF00]/40 bg-[rgba(240,255,0,0.04)] p-6">
          <p className="font-display text-lg">Une question qui reste ?</p>
          <p className="mt-2 text-sm leading-relaxed text-[#f5f5f5]/70">
            L&apos;alpha est ouverte et gratuite. Le plus simple, c&apos;est de
            créer un compte et d&apos;essayer sur tes vrais projets.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="btn-glow gap-2">
              <Link href="/inscription">
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link
              href="mailto:hello@sidekickartists.com"
              className="text-sm text-[#f5f5f5]/60 underline decoration-[#f5f5f5]/20 underline-offset-4 transition-colors hover:text-[#F0FF00]"
            >
              Écrire à l&apos;équipe
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

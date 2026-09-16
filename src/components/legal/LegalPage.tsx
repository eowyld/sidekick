import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { cn, focusRing } from "@/lib/utils";

/** Gabarit commun des pages légales : en-tête, titre, date, pied de page. */
export function LegalPage({
  eyebrow = "Légal",
  title,
  updated,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  updated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#101010] text-[#f5f5f5]">
      <header className="sticky top-0 z-50 border-b border-[rgba(245,245,245,0.12)] bg-[#101010]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="SIDEKICK, accueil"
            className={cn("shrink-0 rounded-sm", focusRing)}
          >
            <SidekickLogo className="h-10 w-auto" priority />
          </Link>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-sm text-sm text-[#f5f5f5]/60 transition-colors hover:text-[#F0FF00]",
              focusRing
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl uppercase sm:text-4xl">{title}</h1>
          <p className="text-sm text-[#f5f5f5]/50">En vigueur au {updated}</p>
        </div>

        {intro && (
          <div className="mt-6 text-sm leading-relaxed text-[#f5f5f5]/70">{intro}</div>
        )}

        <div className="mt-12 space-y-10">{children}</div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#f5f5f5]/70">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <span className="text-[#f5f5f5]/90">{children}</span>;
}

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "rounded-sm text-[#F0FF00] underline underline-offset-4",
    focusRing
  );
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function ContactEmail() {
  return (
    <LegalLink href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</LegalLink>
  );
}

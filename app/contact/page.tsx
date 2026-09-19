import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Instagram, Linkedin, Mail } from "lucide-react";

import { ContactForm } from "@/components/contact/ContactForm";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { SOCIAL_INSTAGRAM, SOCIAL_LINKEDIN } from "@/lib/social";
import { cn, focusRing } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question sur SIDEKICK, un bug à signaler ou une idée à proposer : écris-nous par le formulaire, par email ou sur Instagram.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: LEGAL_CONTACT_EMAIL,
    href: `mailto:${LEGAL_CONTACT_EMAIL}`,
    hint: "Réponse sous deux jours ouvrés.",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: `@${SOCIAL_INSTAGRAM.handle}`,
    href: SOCIAL_INSTAGRAM.url,
    hint: "Les coulisses du produit, et les messages courts.",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: SOCIAL_LINKEDIN.label,
    href: SOCIAL_LINKEDIN.url,
    hint: "Le côté entreprise : partenariats et presse.",
  },
];

export default function ContactPage() {
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
            Contact
          </p>
          <h1 className="font-display text-3xl uppercase sm:text-4xl">
            On te répond
          </h1>
          <p className="max-w-xl pt-2 text-sm leading-relaxed text-[#f5f5f5]/70">
            SIDEKICK est construit par un artiste, pour des artistes. Une
            question, un bug, un écran qui ne colle pas à ton métier : c&apos;est
            exactement ce qu&apos;on a besoin d&apos;entendre.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              target={channel.href.startsWith("http") ? "_blank" : undefined}
              rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={cn(
                "group flex flex-col gap-1 border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] p-5 backdrop-blur-xl transition-colors hover:border-[#F0FF00]/40",
                focusRing
              )}
            >
              <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                <channel.icon className="h-3.5 w-3.5" />
                {channel.label}
              </span>
              <span className="break-all text-sm text-[#f5f5f5] transition-colors group-hover:text-[#F0FF00]">
                {channel.value}
              </span>
              <span className="text-xs text-[#f5f5f5]/50">{channel.hint}</span>
            </a>
          ))}
        </div>

        <section className="mt-12 space-y-6">
          <h2 className="font-display text-xl sm:text-2xl">Écrire un message</h2>
          <ContactForm />
        </section>

        <p className="mt-10 text-xs leading-relaxed text-[#f5f5f5]/50">
          Les informations envoyées par ce formulaire servent uniquement à te
          répondre. Elles ne rejoignent aucune liste de diffusion. Voir la{" "}
          <Link
            href="/confidentialite"
            className="text-[#F0FF00] underline underline-offset-4"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </main>

      <LandingFooter />
    </div>
  );
}

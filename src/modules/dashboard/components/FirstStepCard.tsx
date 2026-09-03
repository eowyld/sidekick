"use client";

import Link from "next/link";
import { ArrowRight, Album, FileSignature, ListChecks, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sector } from "@/hooks/usePreferencesData";

type FirstStep = {
  icon: typeof Mic2;
  title: string;
  body: string;
  cta: string;
  href: string;
};

/**
 * Une action, pas dix. L'utilisateur qui arrive sur un compte vide a besoin
 * d'un point d'entrée unique — une liste de suggestions le laisserait choisir,
 * donc hésiter, donc partir.
 *
 * L'ordre live → phono → édition suit celui de l'onboarding ; le premier
 * secteur coché gagne. Sans secteur, on retombe sur les tâches, qui sont le
 * seul module disponible pour tout le monde.
 */
const STEPS: Record<Sector, FirstStep> = {
  live: {
    icon: Mic2,
    title: "Ajoute ta première date",
    body: "Une date de concert alimente ton calendrier, tes tâches et tes revenus d'un coup. C'est le meilleur point de départ.",
    cta: "Ajouter une date",
    href: "/live/representations",
  },
  phono: {
    icon: Album,
    title: "Ajoute ton premier titre",
    body: "Titre, ISRC, statut de production. Ton catalogue commence par un morceau, et le reste s'y accroche.",
    cta: "Ajouter un titre",
    href: "/phono/catalogue",
  },
  edition: {
    icon: FileSignature,
    title: "Déclare ta première œuvre",
    body: "Ayants droit et répartition des droits. Une fois posé, tu ne le refais plus jamais à la main.",
    cta: "Créer une œuvre",
    href: "/edition",
  },
};

const FALLBACK: FirstStep = {
  icon: ListChecks,
  title: "Crée ta première tâche",
  body: "Note ce que tu dois faire cette semaine. SIDEKICK te la remonte quand l'échéance approche.",
  cta: "Créer une tâche",
  href: "/tasks",
};

export function FirstStepCard({ sectors }: { sectors: Sector[] }) {
  const order: Sector[] = ["live", "phono", "edition"];
  const first = order.find((s) => sectors.includes(s));
  const step = first ? STEPS[first] : FALLBACK;
  const Icon = step.icon;

  return (
    <div className="rounded-sm border border-[#F0FF00]/30 bg-[rgba(240,255,0,0.04)] p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#F0FF00]/40 bg-[#F0FF00]/10">
            <Icon className="h-5 w-5 text-[#F0FF00]" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
              Première étape
            </p>
            <p className="mt-1.5 text-base font-semibold">{step.title}</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#f5f5f5]/60">
              {step.body}
            </p>
          </div>
        </div>

        <Button asChild size="lg" className="btn-glow shrink-0 gap-2">
          <Link href={step.href}>
            {step.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

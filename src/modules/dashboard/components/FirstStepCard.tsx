"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Une action, pas dix. L'utilisateur qui arrive sur un compte vide a besoin
 * d'un point d'entrée unique — une liste de suggestions le laisserait choisir,
 * donc hésiter, donc partir.
 *
 * Ce point d'entrée est le projet : c'est le noeud central de l'application,
 * auquel les dates, les titres, les tâches et les revenus viennent s'accrocher.
 * Le proposer en premier évite de créer des données orphelines.
 */
const STEP = {
  icon: FolderKanban,
  title: "Crée ton premier projet",
  body: "Album, EP, tournée, single : le projet est le point d'ancrage de SIDEKICK. Tes dates, tes titres et tes tâches viennent s'y rattacher.",
  cta: "Créer un projet",
  href: "/projects",
};

export function FirstStepCard() {
  const Icon = STEP.icon;

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
            <p className="mt-1.5 text-base font-semibold">{STEP.title}</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#f5f5f5]/60">
              {STEP.body}
            </p>
          </div>
        </div>

        <Button asChild size="lg" className="btn-glow shrink-0 gap-2">
          <Link href={STEP.href}>
            {STEP.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

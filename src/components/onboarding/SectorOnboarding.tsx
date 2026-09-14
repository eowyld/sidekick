"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Album, Check, FileSignature, Loader2, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferencesData, type Sector } from "@/hooks/usePreferencesData";
import { removeDemoData, seedDemoData } from "@/lib/demo-seed";
import { cn } from "@/lib/utils";

const SECTOR_CHOICES: {
  id: Sector;
  label: string;
  description: string;
  icon: typeof Mic2;
}[] = [
  {
    id: "live",
    label: "Live",
    description: "Tu montes sur scène : dates, répétitions, matériel, cachets.",
    icon: Mic2,
  },
  {
    id: "phono",
    label: "Phono",
    description: "Tu sors de la musique : catalogue, ISRC, sessions studio.",
    icon: Album,
  },
  {
    id: "edition",
    label: "Édition",
    description: "Tu écris ou composes : œuvres, ayants droit, répartitions.",
    icon: FileSignature,
  },
];

/**
 * Onboarding en deux temps, présenté au premier passage sur le tableau de bord.
 *
 * Étape 1 — secteurs : multi-choix, au moins un. Ce n'est qu'un réglage
 * d'affichage, réversible depuis Réglages > Personnalisation ; le texte le dit
 * pour que personne n'hésite par peur de se fermer une porte.
 *
 * Étape 2 — données d'exemple : facultatif, et jamais bloquant. Si le seed
 * échoue, on entre quand même dans le produit : mieux vaut un compte vide
 * qu'un utilisateur coincé sur un écran de chargement.
 */
export function SectorOnboarding({ onDone }: { onDone: () => void }) {
  const posthog = usePostHog();
  const { completeOnboarding, setDemoSeed } = usePreferencesData();

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Sector[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (sector: Sector) => {
    setSelected((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector]
    );
  };

  /** Clôt l'onboarding, avec ou sans données d'exemple. */
  const finish = async (withDemo: boolean) => {
    setBusy(true);

    let seeded = false;
    if (withDemo) {
      try {
        const manifest = await seedDemoData(selected);
        try {
          await setDemoSeed(manifest);
          seeded = true;
        } catch (e) {
          // Le manifeste est la seule trace qui permet d'effacer ces lignes
          // plus tard. Sans lui, l'utilisateur garderait des données fictives
          // ineffaçables : on retire ce qu'on vient de créer plutôt que de le
          // laisser dans cet état.
          console.error("[onboarding] manifeste non enregistré, retrait du seed", e);
          await removeDemoData(manifest).catch((err) =>
            console.error("[onboarding] retrait du seed impossible", err)
          );
        }
      } catch (e) {
        // Volontairement non bloquant, cf. commentaire du composant.
        console.error("[onboarding] seed de démonstration échoué", e);
      }
    }

    completeOnboarding(selected);
    posthog?.capture("onboarding_completed", {
      sectors: selected,
      demo_data: seeded,
    });

    // La notification ne doit jamais retarder l'entrée dans le produit.
    void fetch("/api/notify/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectors: selected, demoData: seeded }),
    }).catch((e) => console.error("[onboarding] notification échouée", e));

    setBusy(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101010]/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] p-8 backdrop-blur-xl">
        {step === 1 ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
              Bienvenue
            </p>
            <h1 className="font-display mt-3 text-3xl sm:text-4xl">
              Qu&apos;est-ce qui te concerne ?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/60">
              Choisis ce dont tu as besoin. Tu peux modifier tes préférences
              quand tu veux depuis les paramètres.
            </p>

            <div className="mt-8 space-y-3">
              {SECTOR_CHOICES.map((choice) => {
                const Icon = choice.icon;
                const checked = selected.includes(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => toggle(choice.id)}
                    aria-pressed={checked}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-sm border p-4 text-left transition-colors",
                      checked
                        ? "border-[#F0FF00] bg-[rgba(240,255,0,0.06)]"
                        : "border-[rgba(245,245,245,0.12)] hover:bg-[rgba(245,245,245,0.04)]"
                    )}
                  >
                    {/*
                      Indicateur purement visuel : un Checkbox Radix rendrait
                      un <button> imbriqué dans celui de la tuile, ce qui est
                      du HTML invalide. L'état est porté par aria-pressed.
                    */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        checked
                          ? "border-[#F0FF00] bg-[#F0FF00]"
                          : "border-[rgba(245,245,245,0.3)]"
                      )}
                    >
                      {checked && (
                        <Check className="h-3 w-3 stroke-[3] text-[#101010]" />
                      )}
                    </span>
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {choice.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[#f5f5f5]/55">
                        {choice.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-xs text-[#f5f5f5]/40">
                {selected.length === 0
                  ? "Choisis au moins un secteur."
                  : `${selected.length} secteur${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}.`}
              </p>
              <Button
                size="lg"
                className="btn-glow gap-2"
                disabled={selected.length === 0}
                onClick={() => setStep(2)}
              >
                Continuer
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
              Dernière étape
            </p>
            <h1 className="font-display mt-3 text-3xl sm:text-4xl">
              Tu veux voir à quoi ça ressemble rempli ?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/60">
              On peut créer un jeu de données fictives — un artiste, ses dates,
              ses titres, un an de revenus — pour que tu explores l&apos;outil
              sans rien saisir. Tout est supprimable en un clic depuis Réglages
              &gt; Personnalisation, et rien ne touchera à ce que tu ajouteras
              toi-même.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => finish(true)}
                className="flex flex-col items-start gap-2 rounded-sm border border-[#F0FF00] bg-[rgba(240,255,0,0.06)] p-5 text-left transition-colors hover:bg-[rgba(240,255,0,0.1)] disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#F0FF00]" />
                  ) : (
                    <Check className="h-4 w-4 text-[#F0FF00]" />
                  )}
                  Remplir avec des exemples
                </span>
                <span className="text-xs leading-relaxed text-[#f5f5f5]/55">
                  Recommandé pour découvrir. Données fictives, effaçables.
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => finish(false)}
                className="flex flex-col items-start gap-2 rounded-sm border border-[rgba(245,245,245,0.12)] p-5 text-left transition-colors hover:bg-[rgba(245,245,245,0.04)] disabled:opacity-60"
              >
                <span className="text-sm font-semibold">Partir de zéro</span>
                <span className="text-xs leading-relaxed text-[#f5f5f5]/55">
                  Compte vide. On te guide sur la première action à faire.
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(1)}
              className="mt-6 text-xs text-[#f5f5f5]/40 transition-colors hover:text-[#f5f5f5]/70 disabled:opacity-60"
            >
              ← Revenir aux secteurs
            </button>
          </>
        )}
      </div>
    </div>
  );
}

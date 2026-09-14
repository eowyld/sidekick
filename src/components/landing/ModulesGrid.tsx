"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn, focusRing, focusRingInset } from "@/lib/utils";
import { LANDING_MODULES } from "./modules-data";
import { SectionGlow } from "./SectionGlow";

/**
 * Grille d'icônes façon « apps » : une tuile par module, clic pour ouvrir
 * le détail dans un panneau plein-largeur sous la grille. Pas de navigation,
 * pas de route dédiée — tout reste sur la landing.
 */
export function ModulesGrid() {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const open = LANDING_MODULES.find((m) => m.id === openId) ?? null;

  /**
   * Ouverture pilotée par l'URL : un lien `#module-<id>` (méga-menu de la nav,
   * lien partagé…) déplie directement le panneau du module visé, en plus du
   * scroll natif vers la tuile.
   */
  useEffect(() => {
    const applyHash = () => {
      const match = window.location.hash.match(/^#module-(.+)$/);
      if (!match) return;
      const id = match[1];
      if (LANDING_MODULES.some((m) => m.id === id)) setOpenId(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  /**
   * Filet de sécurité : les tuiles sont assez basses pour que le panneau tienne
   * dans le même cadrage sur un écran normal, mais sur un petit écran il peut
   * encore déborder. On ne scrolle que dans ce cas.
   */
  useEffect(() => {
    if (!openId) return;
    const panel = panelRef.current;
    if (!panel) return;

    const { bottom } = panel.getBoundingClientRect();
    if (bottom > window.innerHeight) {
      panel.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [openId]);

  return (
    <section
      id="modules"
      // `scroll-mt` obligatoire : la nav est sticky (65 px en mobile, 81 px en
      // desktop). Sans elle, un clic sur « Modules » amenait le haut de section
      // à 0 et l'eyebrow passait sous la nav. Même valeur que les autres ancres.
      className="relative scroll-mt-20 overflow-hidden border-b border-[rgba(245,245,245,0.12)] py-12 md:scroll-mt-24"
    >
      <SectionGlow align="right" />
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
              Modules
            </p>
            <h2 className="font-display text-3xl sm:text-4xl">
              TOUT AU <span className="text-[#F0FF00]">MÊME ENDROIT</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm text-[#f5f5f5]/60">
            Travaille avec les modules dont tu as besoin. Clique ci-dessous pour
            voir ce que chacun propose.
          </p>
        </div>

        {/*
          Remplissage en colonnes : haut en bas, puis gauche à droite.
          Le nombre de rangées par palier donne le nombre de colonnes —
          10 modules sur 2 rangées font 5 colonnes en desktop.
        */}
        {/*
          Pas de `overflow-hidden` ici : une tuile qui s'agrandit au survol
          serait rognée par les bords de la grille. Les filets `gap-px` et la
          bordure suffisent au cadrage ; le `rounded-sm` (2 px) laisse à peine
          dépasser les coins des tuiles.
        */}
        <div className="mt-8 grid auto-cols-fr grid-flow-col grid-rows-5 gap-px rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.12)] sm:grid-rows-4 md:grid-rows-3 lg:grid-rows-2">
          {LANDING_MODULES.map((m) => {
            const Icon = m.icon;
            const isOpen = openId === m.id;
            return (
              <button
                key={m.id}
                id={`module-${m.id}`}
                type="button"
                onClick={() => setOpenId(isOpen ? null : m.id)}
                aria-expanded={isOpen}
                className={cn(
                  // `flex-wrap` : sur une tuile étroite (grille 2 colonnes en
                  // mobile), le badge « Bientôt » passe sous le nom au lieu de
                  // le comprimer — « Marketing » s'affichait « M. ».
                  "group flex scroll-mt-24 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5 text-left",
                  // Agrandissement au survol ; `relative hover:z-10` fait passer
                  // la tuile au-dessus de ses voisines et des filets `gap-px`.
                  "relative transition-all duration-200 ease-out hover:z-10 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
                  // Anneau de focus intérieur : cohérent avec le rendu compact
                  // des tuiles collées.
                  focusRingInset,
                  isOpen
                    ? "bg-[rgba(240,255,0,0.06)]"
                    : "bg-[#101010] hover:bg-[rgba(245,245,245,0.04)]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border transition-colors",
                    isOpen
                      ? "border-[#F0FF00] bg-[#F0FF00]/10"
                      : "border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)]"
                  )}
                >
                  <Icon className="h-4 w-4 text-[#F0FF00]" />
                </span>
                <span className="text-sm font-medium">{m.name}</span>
                {m.comingSoon && (
                  <span className="ml-auto shrink-0 rounded-full border border-[rgba(240,255,0,0.3)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                    Bientôt
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {open && (
          <div
            ref={panelRef}
            className="mt-6 rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] p-8 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  {open.group}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl sm:text-3xl">
                    {open.name.toUpperCase()}
                  </h3>
                  {open.comingSoon && (
                    <span className="rounded-full border border-[rgba(240,255,0,0.3)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                      Disponible bientôt
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className={cn(
                  "rounded-sm p-1.5 text-[#f5f5f5]/50 transition-colors hover:text-[#f5f5f5]",
                  focusRing
                )}
                aria-label="Fermer le détail du module"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#f5f5f5]/70">
              {open.description}
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {open.features.map((f) => {
                const label = typeof f === "string" ? f : f.label;
                const soon = typeof f !== "string" && f.comingSoon;
                return (
                  <li key={label} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        soon ? "text-[#F0FF00]/40" : "text-[#F0FF00]"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        soon ? "text-[#f5f5f5]/50" : "text-[#f5f5f5]/75"
                      )}
                    >
                      {label}
                    </span>
                    {soon && (
                      <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full border border-[rgba(240,255,0,0.3)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                        Bientôt
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

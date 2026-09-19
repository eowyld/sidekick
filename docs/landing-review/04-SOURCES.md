# Sources — composants de la landing

Les fichiers de `src/components/landing/`, dans l'ordre d'apparition sur la page.
Next.js 16 (App Router) + Tailwind. **Régénéré le 2026-09-04** — reflète l'état
courant du dépôt (postérieur à la revue du 3 septembre).

La page est assemblée dans `app/page.tsx` :

```tsx
import { CostComparison } from "@/components/landing/CostComparison";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { ModuleShowcase } from "@/components/landing/ModuleShowcase";
import { ModulesGrid } from "@/components/landing/ModulesGrid";
import { PainPoints } from "@/components/landing/PainPoints";
import { Pricing } from "@/components/landing/Pricing";
import { ProductProof } from "@/components/landing/ProductProof";
import { Roadmap } from "@/components/landing/Roadmap";
import { SignupCta } from "@/components/landing/SignupCta";

export default function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#101010] text-[#f5f5f5]">
      <LandingNav />
      <main>
        <Hero />
        <ModulesGrid />
        <CostComparison />
        <ModuleShowcase />
        <PainPoints />
        <ProductProof />
        <Roadmap />
        <Pricing />
        <SignupCta />
      </main>
      <LandingFooter />
    </div>
  );
}
```

---

## `LandingNav.tsx`

259 lignes — `src/components/landing/LandingNav.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { Button } from "@/components/ui/button";
import { cn, focusRing } from "@/lib/utils";
import { LANDING_MODULES, MODULE_GROUPS } from "./modules-data";

const NAV_LINKS = [
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
];

export function LandingNav() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const megaRef = useRef<HTMLDivElement | null>(null);
  const megaPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermeture du méga-menu au clic extérieur et à l'échappement.
  useEffect(() => {
    if (!megaOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      // Le panneau est rendu hors du <nav> : sans ce second test, un mousedown
      // sur un lien module fermait le menu et démontait le lien avant que le
      // click ne le déclenche — la navigation ne partait jamais.
      if (!megaRef.current?.contains(t) && !megaPanelRef.current?.contains(t)) {
        setMegaOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMegaOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        // Un menu ouvert force le fond plein : sinon, en haut de page, la barre
        // reste transparente et le contenu défile derrière le logo et les liens
        // pendant que le panneau, lui, est opaque.
        megaOpen || mobileOpen
          ? "border-[rgba(245,245,245,0.12)] bg-[#101010]"
          : scrolled
            ? "border-[rgba(245,245,245,0.12)] bg-[#101010]/90 backdrop-blur-xl"
            : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl md:h-20 items-center justify-between gap-6 px-6">
        <Link
          href="/"
          aria-label="SIDEKICK — accueil"
          className={cn("shrink-0 rounded-sm", focusRing)}
        >
          <SidekickLogo className="h-12 w-auto md:h-14" priority />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" ref={megaRef}>
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            aria-expanded={megaOpen}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3.5 py-2 text-[15px] transition-colors",
              focusRing,
              megaOpen
                ? "text-[#F0FF00]"
                : "text-[#f5f5f5]/70 hover:text-[#f5f5f5]"
            )}
          >
            Modules
            <ChevronDown
              className={cn(
                "h-[18px] w-[18px] transition-transform",
                megaOpen && "rotate-180"
              )}
            />
          </button>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "rounded-sm px-3.5 py-2 text-[15px] text-[#f5f5f5]/70 transition-colors hover:text-[#f5f5f5]",
                focusRing
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="md" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="lg" asChild className="btn-glow gap-1.5">
            <Link href="/inscription">
              Créer mon compte <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={cn("rounded-sm p-2 text-[#f5f5f5]/70 md:hidden", focusRing)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Méga-menu desktop : les modules répartis par groupe. */}
      {megaOpen && (
        <div
          ref={megaPanelRef}
          className="absolute inset-x-0 top-16 hidden md:top-20 border-b border-[rgba(245,245,245,0.12)] bg-[#101010] md:block"
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-3">
            {MODULE_GROUPS.map((group) => (
              <div key={group} className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  {group}
                </p>
                <ul className="space-y-1">
                  {LANDING_MODULES.filter((m) => m.group === group).map((m) => {
                    const Icon = m.icon;
                    return (
                      <li key={m.id}>
                        {/*
                          Ancre native (pas de <Link>) : la navigation par le
                          routeur Next passe par history.pushState et ne déclenche
                          pas `hashchange`, donc ModulesGrid n'ouvrirait pas le
                          panneau. Le <a> laisse le navigateur poser le hash.
                        */}
                        <a
                          href={`#module-${m.id}`}
                          onClick={() => setMegaOpen(false)}
                          className={cn(
                            "group flex items-start gap-3 rounded-sm p-2 transition-colors hover:bg-[rgba(245,245,245,0.04)]",
                            focusRing
                          )}
                        >
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)]">
                            <Icon className="h-3.5 w-3.5 text-[#F0FF00]" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm text-[#f5f5f5] transition-colors group-hover:text-[#F0FF00]">
                              {m.name}
                              {m.comingSoon && (
                                <span className="shrink-0 rounded-full border border-[rgba(240,255,0,0.3)] px-1.5 py-px text-[9px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                                  Bientôt
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-xs text-[#f5f5f5]/50">
                              {m.kicker}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu mobile : liste à plat, pas de colonnes. */}
      {mobileOpen && (
        <div className="border-t border-[rgba(245,245,245,0.12)] bg-[#101010] md:hidden">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
            {MODULE_GROUPS.map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  {group}
                </p>
                {LANDING_MODULES.filter((m) => m.group === group).map((m) => (
                  <a
                    key={m.id}
                    href={`#module-${m.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm py-1.5 text-sm text-[#f5f5f5]/80",
                      focusRing
                    )}
                  >
                    {m.name}
                    {m.comingSoon && (
                      <span className="shrink-0 rounded-full border border-[rgba(240,255,0,0.3)] px-1.5 py-px text-[9px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                        Bientôt
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ))}

            <div className="space-y-2 border-t border-[rgba(245,245,245,0.12)] pt-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-sm py-1.5 text-sm text-[#f5f5f5]/80",
                    focusRing
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-sm py-1.5 text-sm text-[#f5f5f5]/80",
                  focusRing
                )}
              >
                Connexion
              </Link>
            </div>

            <Button asChild className="btn-glow w-full gap-1.5">
              <Link href="/inscription" onClick={() => setMobileOpen(false)}>
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
```

---

## `Hero.tsx`

155 lignes — `src/components/landing/Hero.tsx`

```tsx
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, focusRing } from "@/lib/utils";
import { ProductShot } from "./ProductShot";
import dashboardShot from "../../../public/images/landing/dashboard.png";
import dashboardMobile from "../../../public/images/landing/dashboard-mobile.png";

const REASSURANCE: { label: string; href?: string }[] = [
  { label: "Gratuit pendant l'alpha" },
  { label: "Aucune carte bancaire" },
  // Le détail (export sur demande, hébergement UE) vit dans le footer et sur la
  // page dédiée : ici on reste court, le clic mène à la politique.
  { label: "Tes données t'appartiennent", href: "/confidentialite" },
];

/** Légendes de la capture du hero : ce qu'on regarde, dans l'ordre de l'écran. */
const SHOT_CAPTIONS = [
  {
    title: "Ce qui est urgent",
    body: "Les tâches en retard et les événements de la semaine, dès l'ouverture.",
  },
  {
    title: "Ta semaine en une ligne",
    body: "Sept jours, tous modules confondus, sans ouvrir le calendrier.",
  },
  {
    title: "Tes tâches par secteur",
    body: "Live, phono, admin : chaque tâche porte son secteur et ses sous-étapes.",
  },
];

export function Hero() {
  return (
    <section className="relative border-b border-[rgba(245,245,245,0.12)] bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-10 md:pb-12 md:pt-12">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Beatmaker, DJ, musicien, auteur-compositeur
          </p>

          {/*
            `text-balance` : sous 640 px le <br> disparaît et le titre coule.
            Sans lui, « UN SEUL ENDROIT. » se coupait mal ; le balancement
            répartit les mots proprement. Tout le segment est jaune, donc même
            s'il passe sur deux lignes il reste d'un bloc visuellement.
          */}
          <h1 className="text-balance font-display text-3xl leading-[1] sm:text-4xl md:text-5xl lg:text-6xl">
            TOUTE TA CARRIÈRE.
            <br className="hidden sm:block" />{" "}
            <span className="text-[#F0FF00]">UN SEUL ENDROIT.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-[#f5f5f5]/70">
            Royalties, factures, démarches administratives, catalogue de tes
            titres, dates de tournée, presskit… Dix modules reliés entre eux,
            pensés pour les artistes qui font tout eux-mêmes.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button size="lg" asChild className="btn-glow gap-2">
              <Link href="/inscription">
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="btn-glow">
              <Link href="#modules">Voir les modules</Link>
            </Button>
          </div>

          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#f5f5f5]/50">
            {REASSURANCE.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#F0FF00]" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-sm underline decoration-[rgba(245,245,245,0.25)] underline-offset-2 transition-colors hover:text-[#F0FF00] hover:decoration-[#F0FF00]",
                      focusRing
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </ul>

          {/*
            Le fait de crédibilité le moins copiable de la page, dès le premier
            écran. Le récit long vit en bas (section « Qui est derrière ») : ce
            lien y mène pour ceux que ça intéresse, sans détourner le bouton
            d'inscription, qui doit rester direct.
          */}
          <p className="max-w-xl border-l-2 border-[#F0FF00] pl-4 text-base font-medium leading-relaxed text-[#f5f5f5]/90 sm:text-lg">
            Construit par un artiste indépendant, pour des artistes
            indépendants.{" "}
            <Link
              href="#inscription"
              className={cn(
                "whitespace-nowrap rounded-sm text-[#F0FF00] underline decoration-[#F0FF00]/50 underline-offset-4 transition-colors hover:decoration-[#F0FF00]",
                focusRing
              )}
            >
              Lire pourquoi
            </Link>
          </p>
        </div>

        <div className="mt-10 md:mt-14">
          <h2 className="font-display text-xl sm:text-2xl">
            Tableau de bord principal
          </h2>

          {/*
            Capture réduite et légendes à sa droite : à pleine largeur, on
            tombait dessus en défilant sans savoir ce que c'est, et la colonne
            de légendes sous l'image laissait le flanc droit vide.
          */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-10">
            <ProductShot
              src={dashboardShot}
              mobileSrc={dashboardMobile}
              alt="Tableau de bord SIDEKICK : tâches urgentes, événements de la semaine et vue calendrier."
              sizes="(max-width: 1024px) 100vw, 672px"
              priority
            />

            <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {SHOT_CAPTIONS.map((c, i) => (
                <div
                  key={c.title}
                  className="rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] p-4 backdrop-blur-xl"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xs tabular-nums text-[#F0FF00]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <dt className="text-sm font-semibold">{c.title}</dt>
                  </div>
                  <dd className="mt-2 pl-[1.9rem] text-xs leading-relaxed text-[#f5f5f5]/60">
                    {c.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## `ModulesGrid.tsx`

208 lignes — `src/components/landing/ModulesGrid.tsx`

```tsx
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
```

---

## `CostComparison.tsx`

326 lignes — `src/components/landing/CostComparison.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, focusRing } from "@/lib/utils";
import { SIDEKICK_PRICE } from "./pricing-data";

type Row = {
  /** Ce que tu fais réellement. */
  job: string;
  /** L'outil que ça prend aujourd'hui. */
  tool: string;
  /** Coût mensuel indicatif, en euros, pour une formule individuelle. */
  price: number;
  /**
   * Ligne « coût en temps » plutôt qu'en argent : la dernière du tableau
   * capture le lecteur qui ne paie rien aujourd'hui (Notion + tableur). Elle
   * affiche cette durée à la place d'un montant, ne compte pas comme un
   * abonnement et n'entre pas dans le total en euros.
   */
  time?: string;
};

/**
 * Les neuf premières lignes opposent une chose que SIDEKICK fait à l'outil
 * payant qu'un artiste indépendant utilise déjà pour la faire. La dixième —
 * décochée par défaut — est l'option « tout à la main » : son vrai concurrent
 * n'est pas une stack à 111 €, c'est l'inertie Notion + tableur, gratuite mais
 * chronophage. Sans elle, la comparaison suppose une dépense que le lecteur
 * type n'a pas.
 */
const ROWS: Row[] = [
  {
    job: "Tâches et suivi de projets",
    tool: "Notion, Asana, Monday…",
    price: 10,
  },
  { job: "Facturation et devis", tool: "Freebe, Abby…", price: 12 },
  {
    job: "Suivi administratif et comptable",
    tool: "Indy, Tiime…",
    price: 12,
  },
  {
    job: "Suivi des cachets et des heures d'intermittence",
    tool: "Movinmotion…",
    price: 10,
  },
  {
    job: "Planning de tournée et feuille de route",
    tool: "Master Tour, Muzeek…",
    price: 15,
  },
  {
    job: "Stockage et partage des fichiers",
    tool: "Dropbox, WeTransfer Pro…",
    price: 12,
  },
  {
    job: "Hébergement et partage de démos",
    tool: "SoundCloud Pro…",
    price: 12,
  },
  {
    job: "Mailing et liste de diffusion",
    tool: "Mailchimp, Brevo…",
    price: 13,
  },
  {
    job: "Presskit et page artiste",
    tool: "Bandzoogle, Squarespace…",
    price: 15,
  },
  {
    job: "Ou tout à la main, dans Notion et un tableur",
    tool: "Notion + Google Sheets",
    price: 0,
    time: "≈ 3 h / semaine",
  },
];

/** Libellés des lignes qui sont de vrais abonnements — sert au décompte du titre. */
const PAID_JOBS = new Set(ROWS.filter((r) => !r.time).map((r) => r.job));
/** La ligne « tout à la main » : référencée dans l'encart de droite. */
const MANUAL_JOB = ROWS.find((r) => r.time)!.job;

/**
 * Le nombre de lignes est écrit en toutes lettres dans le titre : on le dérive
 * de la sélection pour qu'il ne dérive pas de la table.
 */
const NUMBERS_FR = [
  "zéro", "un", "deux", "trois", "quatre", "cinq",
  "six", "sept", "huit", "neuf", "dix", "onze", "douze",
];
const countFr = (n: number) => NUMBERS_FR[n] ?? String(n);

export function CostComparison() {
  /*
   * Les abonnements sont cochés au départ — la comparaison se lit avant d'être
   * manipulée, et décocher est plus rapide que tout cocher. La ligne « tout à
   * la main » reste décochée : c'est une alternative à SIDEKICK, pas un coût
   * qui s'ajoute aux autres.
   */
  const [selected, setSelected] = useState<string[]>(() =>
    ROWS.filter((r) => !r.time).map((r) => r.job)
  );

  const toggle = (job: string) =>
    setSelected((prev) =>
      prev.includes(job) ? prev.filter((j) => j !== job) : [...prev, job]
    );

  const total = useMemo(
    () =>
      ROWS.filter((r) => !r.time && selected.includes(r.job)).reduce(
        (sum, r) => sum + r.price,
        0
      ),
    [selected]
  );

  const paidCount = selected.filter((j) => PAID_JOBS.has(j)).length;
  const manualSelected = selected.includes(MANUAL_JOB);
  const saved = total - SIDEKICK_PRICE;

  return (
    <section
      id="comparatif"
      className="scroll-mt-20 md:scroll-mt-24 border-b border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Ce que ça te coûte déjà
          </p>
          {/*
            Deux lignes insécables à partir de `sm`, où la place le permet. En
            dessous on laisse le texte revenir à la ligne : « DOUZE ABONNEMENTS, »
            insécable sur 390 px se faisait tronquer au bord de l'écran.
          */}
          <h2 className="font-display text-[clamp(1.5rem,5vw,2.5rem)] leading-[1.05]">
            <span className="block sm:whitespace-nowrap">
              {paidCount > 0
                ? `${countFr(paidCount).toUpperCase()} ABONNEMENT${paidCount > 1 ? "S" : ""},`
                : "TES ABONNEMENTS,"}
            </span>
            <span className="block sm:whitespace-nowrap">
              OU <span className="text-[#F0FF00]">UN SEUL.</span>
            </span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Coche ce que tu paies — ou ta façon de faire — aujourd&apos;hui : le
            calcul suit. Chaque ligne est une chose que SIDEKICK fait nativement,
            chiffrée au tarif moyen par utilisateur de l&apos;abonnement
            correspondant.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr,1fr] lg:items-start">
          {/*
            La colonne « Aujourd'hui » (l'outil concurrent) disparaît sous `sm`.
            C'est la seule des trois dont on peut se passer : sans elle, « ce que
            tu fais » et le prix tiennent sur 390 px. Avec un `min-w` inconditionnel,
            la colonne des prix — soit tout l'argument de la section — sortait de
            l'écran derrière un scroll horizontal que personne ne remarque.
          */}
          <div className="overflow-x-auto rounded-sm border border-[rgba(245,245,245,0.12)]">
            <table className="w-full text-left text-sm sm:min-w-[520px]">
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.03)]">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#f5f5f5]/50">
                    Ce que tu fais
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#f5f5f5]/50 sm:table-cell">
                    Aujourd&apos;hui
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#f5f5f5]/50">
                    Par mois
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const on = selected.includes(row.job);
                  return (
                    <tr
                      key={row.job}
                      onClick={() => toggle(row.job)}
                      className={cn(
                        "cursor-pointer border-b border-[rgba(245,245,245,0.06)] transition-colors last:border-b-0",
                        on
                          ? "hover:bg-[rgba(245,245,245,0.04)]"
                          : "bg-[rgba(245,245,245,0.02)] hover:bg-[rgba(245,245,245,0.04)]"
                      )}
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <Checkbox
                            checked={on}
                            onCheckedChange={() => toggle(row.job)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={
                              row.time
                                ? "Je fais tout à la main aujourd'hui"
                                : `Je paie déjà pour : ${row.job}`
                            }
                            className="border-[rgba(245,245,245,0.3)] focus-visible:ring-[#F0FF00] focus-visible:ring-offset-[#101010] data-[state=checked]:border-[#F0FF00] data-[state=checked]:bg-[#F0FF00] data-[state=checked]:text-[#101010]"
                          />
                          <span
                            className={cn(
                              on ? "text-[#f5f5f5]/80" : "text-[#f5f5f5]/35"
                            )}
                          >
                            {row.job}
                          </span>
                        </span>
                      </td>
                      <td
                        className={cn(
                          "hidden px-5 py-3 sm:table-cell",
                          on ? "text-[#f5f5f5]/50" : "text-[#f5f5f5]/25"
                        )}
                      >
                        {row.tool}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-5 py-3 text-right tabular-nums",
                          on
                            ? row.time
                              ? "text-[#F0FF00]/70"
                              : "text-[#f5f5f5]/60"
                            : row.time
                              ? "text-[#f5f5f5]/25"
                              : "text-[#f5f5f5]/25 line-through"
                        )}
                      >
                        {row.time ?? `${row.price} €`}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[rgba(245,245,245,0.03)]">
                  {/*
                    Mêmes cellules que les lignes du corps — libellé, outil, prix —
                    plutôt qu'un `colSpan`. Un `colSpan={2}` fixe créait une
                    troisième colonne fantôme dès que « Aujourd'hui » est masquée.
                  */}
                  <td className="px-5 py-4 font-semibold text-[#f5f5f5]">
                    {paidCount} abonnement{paidCount > 1 ? "s" : ""}
                  </td>
                  <td className="hidden sm:table-cell" />
                  <td className="whitespace-nowrap px-5 py-4 text-right font-display text-xl tabular-nums">
                    {total} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-sm border border-[#F0FF00]/40 bg-[rgba(240,255,0,0.04)] p-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
              Avec SIDEKICK
            </p>
            <p className="mt-4 font-display text-5xl leading-none">
              {SIDEKICK_PRICE} <span className="text-2xl">€ / mois</span>
            </p>
            {/*
              Le prix affiché est celui d'après-alpha : c'est lui qui rend la
              comparaison lisible (0 € face à 111 € ne compare rien). La ligne
              ci-dessous évite la contradiction avec la section Tarifs, qui
              annonce l'alpha gratuite.
            */}
            <p className="mt-2 text-sm text-[#f5f5f5]/70">
              <span className="font-medium text-[#F0FF00]">Gratuit</span>{" "}
              pendant toute l&apos;alpha.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/70">
              Tout ça dans un seul abonnement, avec les données reliées entre
              elles. Une date de concert alimente ton calendrier, tes tâches et
              tes revenus sans que tu la ressaisisses.
            </p>
            <p className="mt-4 font-display text-lg text-[#F0FF00]">
              {saved > 0
                ? `${saved} € économisés par mois`
                : manualSelected
                  ? "Et 3 h par semaine qui repassent dans la musique"
                  : "Et tout le reste en prime"}
            </p>
            {manualSelected && saved > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-[#f5f5f5]/70">
                Et si tu fais tout à la main aujourd&apos;hui : les trois heures
                hebdo passées à recopier d&apos;un outil à l&apos;autre, en moins.
              </p>
            )}
            <Button asChild size="lg" className="btn-glow mt-6 w-full gap-2">
              <Link href="/inscription">
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-center">
              <Link
                href="#pricing"
                className={cn(
                  "rounded-sm text-sm text-[#f5f5f5]/50 underline decoration-[#f5f5f5]/20 underline-offset-4 transition-colors hover:text-[#f5f5f5]/80 hover:decoration-[#f5f5f5]/50",
                  focusRing
                )}
              >
                Voir les tarifs
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-[#f5f5f5]/30">
          Tarifs publics constatés pour les formules individuelles, relevés en
          septembre 2026. Les marques citées appartiennent à leurs éditeurs
          respectifs et ne sont pas affiliées à SIDEKICK.
        </p>
      </div>
    </section>
  );
}
```

---

## `ModuleShowcase.tsx`

215 lignes — `src/components/landing/ModuleShowcase.tsx`

```tsx
import type { StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import { ProductShot } from "./ProductShot";
import { SectionGlow } from "./SectionGlow";
import editionShot from "../../../public/images/landing/edition.png";
import editionMobile from "../../../public/images/landing/edition-mobile.png";
import liveShot from "../../../public/images/landing/live.png";
import liveMobile from "../../../public/images/landing/live-mobile.png";
import revenusShot from "../../../public/images/landing/revenus.png";
import revenusMobile from "../../../public/images/landing/revenus-mobile.png";

type Feature = {
  label: string;
  /** Une ligne d'explication concrète — c'est elle qui porte le fond. */
  detail: string;
  comingSoon?: true;
};

type Showcase = {
  id: string;
  eyebrow: string;
  /** Le mot ou segment passé en accent. Un seul par bloc. */
  title: string;
  accent: string;
  features: Feature[];
  image: StaticImageData;
  /** Recadrage de détail affiché sous 640 px, cf. ProductShot. */
  mobileImage: StaticImageData;
  alt: string;
};

const SHOWCASES: Showcase[] = [
  {
    id: "live",
    eyebrow: "Live",
    title: "TA TOURNÉE TIENT",
    accent: "DANS UN ÉCRAN.",
    features: [
      {
        label: "Suivi des dates",
        detail:
          "Répétitions et représentations, triées par statut, de la première idée à la date jouée.",
      },
      {
        label: "Prospection",
        detail:
          "Un vrai accompagnement en amont : contacts, relances et suivi jusqu'à ce qu'un projet se concrétise.",
      },
      {
        label: "Suivi admin",
        detail: "Transport, logement, contrat, rémunération : rattachés à chaque date.",
      },
      {
        label: "Itinéraire sur carte",
        detail:
          "Les dates se placent seules dans l'ordre, la tournée se dessine sans rien saisir.",
      },
      {
        label: "Inventaire du matériel",
        detail:
          "Ton parc et une liste dédiée pour chacun de tes dispositifs de tournée.",
      },
    ],
    image: liveShot,
    mobileImage: liveMobile,
    alt: "Module Live : répartition des dates par statut, prochains événements et itinéraire de tournée sur carte.",
  },
  {
    id: "incomes",
    eyebrow: "Revenus",
    title: "CE QUE TU GAGNES",
    accent: "VRAIMENT.",
    features: [
      {
        label: "Encaissé & à venir",
        detail:
          "Droits d'auteur, phono, facturation et intermittence sur une seule courbe, comparée à l'an dernier.",
      },
      {
        label: "Factures & relances",
        detail:
          "Ce qui reste à encaisser et les relances à envoyer, sans rouvrir de tableur.",
      },
      {
        label: "Intermittence & cachets",
        detail:
          "Missions, cachets et heures qui comptent pour tes droits, suivis à part.",
      },
      {
        label: "Import des relevés",
        detail:
          "DistroKid, TuneCore, CD Baby, SoundCloud : les relevés se rangent tout seuls.",
        comingSoon: true,
      },
    ],
    image: revenusShot,
    mobileImage: revenusMobile,
    alt: "Module Revenus : encaissé sur l'année, factures en attente et évolution mensuelle par source de revenu.",
  },
  {
    id: "edition",
    eyebrow: "Édition",
    title: "TES DROITS, AU",
    accent: "POURCENT PRÈS.",
    features: [
      {
        label: "Ayants droit & rôles",
        detail:
          "Auteurs, compositeurs, arrangeurs, éditeur : la répartition de chaque œuvre, au pourcent près.",
      },
      {
        label: "Répartition DEP / DRM",
        detail:
          "Droits d'exécution et de reproduction visualisés, prêts pour la déclaration.",
      },
      {
        label: "Territoires & exploitations",
        detail: "Où et comment chaque œuvre peut être exploitée.",
      },
      {
        label: "Pistes de synchronisation",
        detail: "Le suivi des opportunités de synchro, de la piste au contrat signé.",
        comingSoon: true,
      },
    ],
    image: editionShot,
    mobileImage: editionMobile,
    alt: "Module Édition : ayants droit d'une œuvre et répartition graphique des droits DEP et DRM.",
  },
];

export function ModuleShowcase() {
  return (
    <section className="relative overflow-hidden border-b border-[rgba(245,245,245,0.12)] py-12">
      <SectionGlow align="left" />
      {/*
        Pas d'en-tête ici : la section montre l'appli, elle n'a pas à
        réintroduire la promesse déjà portée par les sections du dessus.
        Chaque bloc porte son propre titre.

        Pas de paragraphe d'accroche non plus : le titre pose la promesse, la
        liste de features en dit le détail. Chaque feature = un intitulé + une
        ligne concrète, présentée en liste bordée (et non en checklist, motif
        déjà utilisé par la grille de modules au-dessus).
      */}
      <div className="relative z-10 mx-auto max-w-6xl space-y-16 px-6">
        {SHOWCASES.map((s, i) => (
          <div
            key={s.id}
            id={`showcase-${s.id}`}
            className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-12"
          >
            <div
              className={cn(
                "space-y-6",
                // Alternance : une section sur deux inverse texte et visuel.
                i % 2 === 1 && "lg:order-2"
              )}
            >
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  {s.eyebrow}
                </p>
                <h3 className="font-display text-2xl leading-tight sm:text-3xl">
                  {s.title}{" "}
                  <span className="text-[#F0FF00]">{s.accent}</span>
                </h3>
              </div>

              <ul className="space-y-4">
                {s.features.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      "border-l-2 pl-4",
                      f.comingSoon
                        ? "border-[rgba(245,245,245,0.12)]"
                        : "border-[#F0FF00]/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          f.comingSoon ? "text-[#f5f5f5]/60" : "text-[#f5f5f5]"
                        )}
                      >
                        {f.label}
                      </span>
                      {f.comingSoon && (
                        <span className="whitespace-nowrap rounded-full border border-[rgba(240,255,0,0.3)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                          Bientôt
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#f5f5f5]/55">
                      {f.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <ProductShot
              src={s.image}
              mobileSrc={s.mobileImage}
              alt={s.alt}
              className={cn(i % 2 === 1 && "lg:order-1")}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## `PainPoints.tsx`

60 lignes — `src/components/landing/PainPoints.tsx`

```tsx
const PAINS = [
  {
    title: "T'es encore en retard sur une déclaration",
    body: "URSSAF, TVA, actualisation France Travail : des échéances qui tombent sans prévenir, notées nulle part.",
  },
  {
    title: "Ta facture, c'est un Word que tu modifies depuis deux ans",
    body: "Numérotation approximative, relances oubliées, TVA recalculée à la main.",
  },
  {
    title: "Tu as renvoyé la mauvaise version du morceau. Encore.",
    body: "Parce que le master final s'appelle mix_v4_FINAL_ok2.wav dans un dossier partagé.",
  },
];

export function PainPoints() {
  return (
    <section className="border-b border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Tu reconnais ça ?
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            LA GESTION TE <span className="text-[#F0FF00]">COUPE</span> DE TA
            MUSIQUE
          </h2>
        </div>

        {/*
          Liste-manifeste, pas un damier : trois constats numérotés, pleine
          largeur, aucun cadre. Le motif bordé « mosaïque » est réservé à la
          grille de modules — le réutiliser ici, à ProductProof et à Roadmap
          donnait trois sections qui se ressemblaient.
        */}
        <div className="mt-10 space-y-8">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              className="grid gap-x-5 gap-y-1 md:grid-cols-[3rem_1fr]"
            >
              <span className="font-display text-2xl leading-none tabular-nums text-[#F0FF00]/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                {/* h3 (sous le h2 de section) : lecteurs d'écran et indexation
                    ont besoin de la sous-structure. Preflight neutralise le
                    style par défaut du heading — rien ne bouge visuellement. */}
                <h3 className="font-display text-xl leading-snug">{p.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f5f5]/60">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## `ProductProof.tsx`

73 lignes — `src/components/landing/ProductProof.tsx`

```tsx
import { cn } from "@/lib/utils";

/**
 * Section « différenciation » : en alpha, aucun chiffre d'usage ni témoignage
 * n'est réel, donc on ne joue pas la preuve sociale. On tient trois arguments
 * qu'un outil pensé ailleurs ne sort pas — l'intermittence et les statuts
 * français, la conformité Factur-X, l'hébergement UE.
 *
 * `valueClass` : la première tuile a un intitulé long (« Intermittence ·
 * URSSAF »), on le rend plus petit pour qu'il tienne sans casser la rangée.
 */
const FACTS = [
  {
    value: "Intermittence · URSSAF",
    valueClass: "text-3xl leading-tight sm:text-4xl",
    label: "droits, charges et statuts",
    detail:
      "Cachets et heures d'intermittence, statuts juridiques, échéances URSSAF, France Travail et TVA — suivis au même endroit que tes revenus.",
  },
  {
    value: "Factur-X",
    label: "facturation électronique",
    detail:
      "Tes factures au format imposé par la réforme française. Aucun outil anglophone ne le couvre.",
  },
  {
    value: "UE",
    label: "hébergement",
    detail:
      "Tes données restent en Europe, exportables sur simple demande.",
  },
];

export function ProductProof() {
  return (
    <section className="border-b border-[rgba(245,245,245,0.12)] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Pensé d&apos;ici
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            FAIT POUR LA RÉALITÉ DU{" "}
            <span className="text-[#F0FF00]">MARCHÉ FRANÇAIS.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Intermittence, statuts, facturation électronique, hébergement
            européen. Pas l&apos;adaptation d&apos;un outil pensé ailleurs.
          </p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {FACTS.map((f) => (
            <div
              key={f.label}
              className="border-t-2 border-[#F0FF00] pt-5"
            >
              <p className={cn("font-display leading-none", f.valueClass ?? "text-5xl")}>
                {f.value}
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[#f5f5f5]/80">
                {f.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#f5f5f5]/55">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## `Roadmap.tsx`

112 lignes — `src/components/landing/Roadmap.tsx`

```tsx
import {
  FileSignature,
  Link2,
  Radio,
  ScanBarcode,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, hoverZoom } from "@/lib/utils";

type Upcoming = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/**
 * Roadmap volontairement courte : les six chantiers qui changent le rapport de
 * l'artiste à son argent et à sa diffusion. Aucune date n'est promise — une
 * roadmap datée devient une dette dès qu'elle glisse.
 */
const UPCOMING: Upcoming[] = [
  {
    icon: Radio,
    title: "Distribution sur les plateformes",
    body: "Envoyer tes sorties en streaming depuis SIDEKICK, sans repasser par un distributeur tiers.",
  },
  {
    icon: Wallet,
    title: "Récupération de tes droits d'auteur",
    body: "SIDEKICK va chercher ce qui te revient au lieu de te laisser courir après.",
  },
  {
    icon: TrendingUp,
    title: "Suivi automatique de tes œuvres",
    body: "Statistiques et revenus cumulés, par œuvre et par enregistrement, sans import manuel.",
  },
  {
    icon: ScanBarcode,
    title: "Génération de codes ISRC et UPC",
    body: "Tes codes créés directement ici, au lieu d'être demandés ailleurs et recopiés à la main.",
  },
  {
    icon: Link2,
    title: "Smartlinks",
    body: "Un lien unique vers toutes tes plateformes d'écoute et de téléchargement.",
  },
  {
    icon: FileSignature,
    title: "Gestion des contrats",
    body: "Modèles, envoi et signature en ligne, rattachés à tes dates et à tes projets.",
  },
];

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="scroll-mt-20 md:scroll-mt-24 border-b border-[rgba(245,245,245,0.12)] py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            En développement
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            LA SUITE EST <span className="text-[#F0FF00]">ÉCRITE.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Ces fonctionnalités arriveront au lancement officiel de
            l&apos;application.
          </p>
        </div>

        {/*
          Cartes bordées distinctes, avec de vrais espaces entre elles — pas le
          damier collé « gap-px » de la grille de modules, ni les listes à plat
          de Pain Points / ProductProof. Le badge « En développement » par carte
          a sauté : il répétait l'eyebrow de la section.
        */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UPCOMING.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cn(
                  "rounded-sm border border-[rgba(245,245,245,0.12)] p-5",
                  // Agrandissement au survol ; `hover:z-10` pour passer au-dessus
                  // des cartes voisines pendant le zoom.
                  "relative hover:z-10 hover:border-[#F0FF00]/25",
                  hoverZoom
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[#F0FF00]/25 bg-[#F0FF00]/5">
                  <Icon className="h-4 w-4 text-[#F0FF00]" />
                </span>
                {/* h3 sous le h2 de section : balisage, pas de style — Preflight
                    aligne le heading sur les classes ci-dessous. */}
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#f5f5f5]/55">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

---

## `Pricing.tsx`

91 lignes — `src/components/landing/Pricing.tsx`

```tsx
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIDEKICK_PRICE } from "./pricing-data";
import { SectionGlow } from "./SectionGlow";

/**
 * Une seule offre affichée : l'alpha est gratuite et ouverte à tous. Montrer
 * une grille de trois formules qu'on ne peut pas encore acheter ferait
 * travailler le lecteur sur une décision qu'il n'a pas à prendre. Le tarif
 * d'après-alpha reste mentionné en une ligne, pour l'ancrage et pour signaler
 * que le produit a un modèle économique.
 *
 * La liste ci-dessous suit le périmètre ouvert de l'alpha (cf. ALPHA.md) :
 * Marketing en est absent, il est encore fermé.
 */
const INCLUDED = [
  "Tableau de bord, tâches et calendrier",
  "Contacts et projets",
  "Revenus : facturation, royalties, droits d'auteur",
  "Intermittence et suivi des cachets",
  "Live, Phono et Édition",
  "Admin : statuts, démarches et rappels d'échéance",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-20 overflow-hidden md:scroll-mt-24 border-b border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] py-12"
    >
      <SectionGlow align="right" />
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Tarifs
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            SIMPLE. FAIT POUR <span className="text-[#F0FF00]">LES INDÉS.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            L&apos;alpha est gratuite et ouverte à tous. Pas de carte bancaire,
            pas d&apos;engagement.
          </p>
        </div>

        <div className="mt-8 rounded-sm border border-[#F0FF00]/40 bg-[rgba(240,255,0,0.04)] p-8 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <span className="inline-block rounded-sm bg-[#F0FF00] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#101010]">
                Alpha ouverte
              </span>

              <p className="mt-5 font-display text-6xl leading-none">0 €</p>

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#f5f5f5]/65">
                Accès complet au produit pendant toute l&apos;alpha. Tu crées ton
                compte, tu choisis tes secteurs, tu commences.
              </p>

              <Button asChild size="lg" className="btn-glow mt-8 w-full gap-2 sm:w-auto">
                <Link href="/inscription">
                  Créer mon compte <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f5f5f5]/40">
                Ce qui est inclus
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F0FF00]" />
                    <span className="text-[#f5f5f5]/75">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-[#f5f5f5]/45">
          Après l&apos;alpha, à partir de {SIDEKICK_PRICE} € par mois. Sans
          engagement.
        </p>
      </div>
    </section>
  );
}
```

---

## `SignupCta.tsx`

83 lignes — `src/components/landing/SignupCta.tsx`

```tsx
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = [
  "Compte créé et utilisable immédiatement",
  "Gratuit pendant toute l'alpha, sans carte bancaire",
  "Tu choisis tes secteurs, on masque le reste",
  "Des données d'exemple si tu veux explorer sans rien saisir",
];

/**
 * Remplace l'ancien formulaire de liste d'attente : l'inscription est ouverte,
 * il n'y a plus rien à mettre en attente.
 *
 * La colonne de gauche porte le mot du fondateur plutôt qu'un énième appel à
 * l'action : c'est le seul argument de la page qu'aucun concurrent ne peut
 * copier, et il tombe juste avant le bouton d'inscription.
 */
export function SignupCta() {
  return (
    <section
      id="inscription"
      className="scroll-mt-20 md:scroll-mt-24 border-b border-[rgba(245,245,245,0.12)] py-12"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Qui est derrière
          </p>
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">
            JE SUIS ARTISTE.
            <br />
            <span className="text-[#F0FF00]">COMME TOI.</span>
          </h2>
          <div className="max-w-md space-y-4 text-sm leading-relaxed text-[#f5f5f5]/60">
            <p>
              Je travaille dans la musique, et ma plus grosse barrière n&apos;a
              jamais été la créativité : c&apos;est la charge mentale.
              J&apos;organise très bien la carrière des autres. Beaucoup moins
              la mienne.
            </p>
            <p>
              SIDEKICK, c&apos;est l&apos;outil dont je rêvais : mes dates, mes
              titres, mes revenus et mes statuts au même endroit. Je l&apos;ouvre
              à d&apos;autres artistes. Ça te dit d&apos;essayer&nbsp;?
            </p>
          </div>
          <p className="text-sm text-[#f5f5f5]/45">
            <span className="font-medium text-[#f5f5f5]/75">Eliott</span> —
            artiste et fondateur de SIDEKICK
          </p>
        </div>

        <div className="rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.4)] p-8">
          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F0FF00]" />
                <span className="text-[#f5f5f5]/75">{point}</span>
              </li>
            ))}
          </ul>

          <Button asChild size="lg" className="btn-glow mt-8 w-full gap-2">
            <Link href="/inscription">
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="btn-glow mt-3 w-full gap-2"
          >
            <Link href="/login">J&apos;ai déjà un compte</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

---

## `LandingFooter.tsx`

96 lignes — `src/components/landing/LandingFooter.tsx`

```tsx
import Link from "next/link";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { cn, focusRing } from "@/lib/utils";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    // Ancres préfixées par « / » : le footer apparaît aussi sur des pages hors
    // landing (confidentialité…), où « #modules » seul ne pointerait sur rien.
    links: [
      { label: "Modules", href: "/#modules" },
      { label: "Tarifs", href: "/#pricing" },
      { label: "Comparatif", href: "/#comparatif" },
      { label: "En développement", href: "/#roadmap" },
      { label: "Créer mon compte", href: "/inscription" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Compte",
    links: [
      { label: "Connexion", href: "/login" },
      { label: "Créer un compte", href: "/inscription" },
    ],
  },
  {
    title: "Légal",
    links: [{ label: "Confidentialité", href: "/confidentialite" }],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#0a0a0a] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-[1.5fr,repeat(4,1fr)]">
          <div className="space-y-4">
            <SidekickLogo className="h-16 w-auto" />
            <p className="max-w-xs text-sm leading-relaxed text-[#f5f5f5]/50">
              Un manager tout-en-un pour les artistes de musique indépendants.
              Phono, édition, live, marketing, revenus, administratif.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        "rounded-sm text-sm text-[#f5f5f5]/60 transition-colors hover:text-[#F0FF00]",
                        focusRing
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-2 border-t border-[rgba(245,245,245,0.12)] pt-8">
          <p className="max-w-xl text-xs leading-relaxed text-[#f5f5f5]/45">
            Tes données t&apos;appartiennent : export de toutes tes données sur
            simple demande, hébergement en Europe.{" "}
            <Link
              href="/confidentialite"
              className={cn(
                "rounded-sm underline decoration-[rgba(245,245,245,0.25)] underline-offset-2 transition-colors hover:text-[#F0FF00] hover:decoration-[#F0FF00]",
                focusRing
              )}
            >
              En savoir plus
            </Link>
          </p>
          <p className="text-xs text-[#f5f5f5]/30">
            © {new Date().getFullYear()} SIDEKICK. Alpha ouverte.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

---

## `ProductShot.tsx`

86 lignes — `src/components/landing/ProductShot.tsx`

```tsx
import Image, { type StaticImageData } from "next/image";
import { cn, hoverZoom } from "@/lib/utils";

type ProductShotProps = {
  src: StaticImageData;
  /**
   * Variante affichée sous 640 px. Une capture d'écran complète réduite à la
   * largeur d'un téléphone tombe à ~0,3× : on distingue des formes, plus un mot.
   * On lui substitue un recadrage de détail (une zone de ~470 px de l'app), qui
   * s'affiche lui à ~0,73× et reste lisible.
   */
  mobileSrc?: StaticImageData;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/**
 * Cadre de capture produit : bordure fine, fond sombre, halo jaune diffus.
 *
 * L'image est importée statiquement, donc Next connaît ses dimensions réelles :
 * on affiche chaque capture à son ratio naturel plutôt que de la forcer dans un
 * cadre fixe. Les captures vont de 1.31 (Édition) à 2.20 (Revenus) — un ratio
 * imposé en rognerait une partie.
 */
export function ProductShot({
  src,
  mobileSrc,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 1024px) 100vw, 576px",
}: ProductShotProps) {
  const frame = cn(
    "overflow-hidden rounded-sm border border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] shadow-[0_24px_80px_-24px_rgba(240,255,0,0.18)]",
    // Agrandissement au survol, comme les cartes de l'app.
    hoverZoom,
    className
  );

  if (!mobileSrc) {
    return (
      <div className={frame}>
        <Image
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          quality={90}
          placeholder="blur"
          className="h-auto w-full"
        />
      </div>
    );
  }

  /*
   * Deux `Image` plutôt qu'un `<picture>` : chacune garde ses dimensions
   * intrinsèques, donc son propre ratio, sans déformation ni saut de mise en
   * page. Le `sizes` à `1px` sur la variante masquée fait choisir au navigateur
   * la plus petite déclinaison du srcSet : l'image cachée ne coûte presque rien.
   */
  return (
    <div className={frame}>
      <Image
        src={mobileSrc}
        alt={alt}
        priority={priority}
        sizes="(max-width: 639px) 100vw, 1px"
        quality={90}
        placeholder="blur"
        className="h-auto w-full sm:hidden"
      />
      <Image
        src={src}
        alt={alt}
        priority={priority}
        sizes={`(max-width: 639px) 1px, ${sizes}`}
        quality={90}
        placeholder="blur"
        className="hidden h-auto w-full sm:block"
      />
    </div>
  );
}
```

---

## `modules-data.ts`

213 lignes — `src/components/landing/modules-data.ts`

```ts
import {
  Album,
  Building2,
  CalendarDays,
  FileSignature,
  FolderKanban,
  ListChecks,
  Megaphone,
  Mic2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type LandingModule = {
  /** Identifiant stable, sert d'ancre et de clé de panneau. */
  id: string;
  name: string;
  /**
   * Groupe affiché dans le méga-menu de la nav. Reprend la segmentation de la
   * sidebar de l'app : Organisation, Artistique, Business.
   */
  group: "Organisation" | "Artistique" | "Business";
  icon: LucideIcon;
  /** Une ligne, affichée sous le nom dans le panneau ouvert. */
  kicker: string;
  /**
   * Deux phrases max, à hauteur d'artiste : ce que le module change dans ta
   * façon de travailler. Pas d'énumération de fonctionnalités ni de termes
   * techniques — ils sont juste en dessous, dans `features`.
   */
  description: string;
  /**
   * Le concret, en langage métier : ce que le module sait faire, nommé
   * précisément. Une chaîne pour une fonctionnalité livrée, un objet pour
   * celle qui ne l'est pas encore — la grille lui accole alors l'étiquette
   * « Bientôt ».
   */
  features: (string | { label: string; comingSoon: true })[];
  /** Module annoncé mais pas encore livré : affiche l'étiquette « Bientôt ». */
  comingSoon?: boolean;
};

/**
 * L'ordre de ce tableau pilote la grille, le footer et l'ordre interne du
 * méga-menu. Il suit l'ordre de la sidebar de l'app (le tableau de bord n'y
 * figure pas : il est déjà présenté par la capture du hero).
 */
export const LANDING_MODULES: LandingModule[] = [
  {
    id: "calendar",
    name: "Calendrier",
    group: "Organisation",
    icon: CalendarDays,
    kicker: "Vue transversale",
    description:
      "Tu sais ce qui t'attend. Ce que tu saisis dans les autres modules atterrit ici, et ton agenda habituel reste à jour.",
    features: [
      "Concerts, répétitions, sessions studio, échéances et deadlines agrégés",
      "Vue mensuelle et hebdomadaire",
      "Flux iCal : abonne Google Agenda ou Apple Calendrier",
    ],
  },
  {
    id: "tasks",
    name: "Tâches",
    group: "Organisation",
    icon: ListChecks,
    kicker: "À faire, par secteur",
    description:
      "Tu avances sur ce qui compte au lieu d'essayer de te rappeler ce qu'il restait à faire. Rien ne passe à la trappe parce que c'était noté ailleurs.",
    features: [
      "Tâches par secteur, avec sous-étapes",
      "Dates limites, avec alerte quand l'échéance approche ou est dépassée",
      "Vue du jour et backlog",
      {
        label: "Suggestions de tâches à partir de tes autres modules",
        comingSoon: true,
      },
    ],
  },
  {
    id: "contacts",
    name: "Contacts",
    group: "Organisation",
    icon: Users,
    kicker: "Carnet professionnel",
    description:
      "Ton réseau devient un vrai carnet d'adresses, pas un fil de messages où tu fouilles. Tu retrouves la bonne personne au moment où tu en as besoin.",
    features: [
      "Fiches par métier et par structure",
      "Recherche et filtre par métier",
    ],
  },
  {
    id: "projects",
    name: "Projets",
    group: "Organisation",
    icon: FolderKanban,
    kicker: "Le point de départ",
    description:
      "Tu arrêtes de mener tes sorties à l'instinct. Chaque album, single ou tournée devient un projet que tu ouvres pour savoir où tu en es, ce qu'il reste à faire et ce que ça te coûte, avec une vue d'ensemble de chaque module.",
    features: [
      "Un projet par album, single, EP ou tournée",
      "Onglets création, marketing, admin et budget",
      "Budget prévisionnel vs dépenses réelles, revenus et balance en direct",
      "Œuvres, titres, dates et tâches rattachés au projet",
    ],
  },
  {
    id: "live",
    name: "Live",
    group: "Artistique",
    icon: Mic2,
    kicker: "Scène & tournée",
    description:
      "Tu sais où en est chaque date : celles que tu relances, celles qui sont signées, celles qui approchent. Et ce que chacune te rapporte une fois les frais déduits.",
    features: [
      "Dates par statut : prospection, confirmée, signée",
      "Prospection de lieux et suivi des relances",
      "Itinéraire de tournée sur carte",
      "Répétitions et plannings",
      "Inventaire matériel et listes de départ",
    ],
  },
  {
    id: "phono",
    name: "Phono",
    group: "Artistique",
    icon: Album,
    kicker: "Catalogue prêt à distribuer",
    description:
      "Ton catalogue devient présentable : plus un dossier de fichiers nommés à la main, mais quelque chose que tu peux envoyer tel quel à un distributeur, un label ou un ingé master.",
    features: [
      "Métadonnées écrites dans le fichier audio : ISRC, crédits, pochette",
      "Crédits par rôle : compositeur, beatmaker, ingé mixage, mastering",
      "Export d'un titre ou d'un album entier en ZIP",
      "Statut de production : en cours, mixé, mastérisé, publié",
      "Albums, EP, podcasts et sessions studio rattachés aux titres",
    ],
  },
  {
    id: "edition",
    name: "Édition",
    group: "Artistique",
    icon: FileSignature,
    kicker: "Œuvres & répartition des droits",
    description:
      "Tes droits ne reposent plus sur ta mémoire ni sur un tableur. Qui a fait quoi, qui touche quoi : c'est écrit, à jour, et prêt le jour où il faut déclarer.",
    features: [
      "Ayants droit et rôles par œuvre : auteur, compositeur, arrangeur, éditeur",
      "Répartition DEP et DRM en pourcentages",
      "Territoires et types d'exploitation",
      { label: "Suivi des opportunités de synchronisation", comingSoon: true },
    ],
  },
  {
    id: "incomes",
    name: "Revenus",
    group: "Business",
    icon: Wallet,
    kicker: "Facturation & royalties",
    description:
      "Tu sais enfin ce que ta musique te rapporte, et d'où ça vient. De quoi budgéter une sortie, négocier un cachet et arrêter de découvrir ton année chez le comptable.",
    features: [
      "Droits d'auteur, droits phono, facturation et intermittence dans un seul graphe",
      "Encaissé, à venir, moyenne mensuelle et source principale",
      "Factures : en attente, payées, relances",
      "Évolution mensuelle comparée à l'an dernier",
      {
        label: "Import des relevés DistroKid, TuneCore, CD Baby, SoundCloud",
        comingSoon: true,
      },
    ],
  },
  {
    id: "admin",
    name: "Admin",
    group: "Business",
    icon: Building2,
    kicker: "Statuts, démarches & documents",
    description:
      "L'administratif cesse d'être ce que tu repousses parce que c'est éparpillé. Tu vois où tu en es et ce qui tombe bientôt, sans ouvrir six espaces en ligne.",
    features: [
      "Statuts et structures juridiques",
      "Démarches suivies par échéance : URSSAF, France Travail, TVA",
      "Espace documents et stockage de fichiers",
      { label: "Suivi comptable", comingSoon: true },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    group: "Business",
    icon: Megaphone,
    kicker: "Audience & presskit",
    description:
      "Tu ne laisses plus une sortie passer inaperçue faute de temps. Annoncer un titre ou démarcher un programmateur redevient une routine, pas un chantier de trois soirées.",
    features: [
      "Liste de diffusion segmentée : fans, pros, presse",
      "Campagnes email rattachées à un projet",
      "Presskit en ligne, partagé par lien",
      "Plan de com' d'une sortie dans le calendrier",
    ],
    comingSoon: true,
  },
];

export const MODULE_GROUPS = [
  "Organisation",
  "Artistique",
  "Business",
] as const;
```

---

## `pricing-data.ts`

12 lignes — `src/components/landing/pricing-data.ts`

```ts
/**
 * Tarif mensuel affiché sur la landing, en euros.
 *
 * Il apparaît à deux endroits qui doivent rester d'accord : le calcul
 * d'économies du comparatif (`CostComparison`) et la mention d'après-alpha sous
 * la carte tarifaire (`Pricing`). Un chiffre écrit en dur des deux côtés finit
 * toujours par diverger — d'où cette constante partagée.
 *
 * Pendant l'alpha l'accès est gratuit ; ce prix est celui annoncé pour la suite,
 * sans date de bascule.
 */
export const SIDEKICK_PRICE = 8;
```

---

# Pages & utilitaires liés (hors landing, mais atteignables depuis sa nav / son footer)

- `src/lib/utils.ts` — dont `focusRing` / `focusRingInset`, l'anneau de focus clavier posé sur tous les éléments interactifs nus.
- `FaqSection.tsx` + `app/faq/page.tsx` — la FAQ, désormais **une page `/faq` autonome** (liée depuis la nav et le footer), plus une section de la landing.
- `app/confidentialite/page.tsx` — politique de confidentialité, **brouillon** (mentions `[à compléter]`), liée depuis le hero et le footer.

## `utils.ts`

30 lignes — `src/lib/utils.ts`

```ts
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Anneau de focus clavier — l'accent néon #F0FF00 sur fond sombre fait un
 * indicateur net. À poser sur tout élément interactif « nu » (`<a>`, `<button>`,
 * `<Link>`) ; les primitives `src/components/ui/*` l'ont déjà.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]";

/** Variante pour un élément dans un conteneur `overflow-hidden` (l'anneau extérieur serait rogné). */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F0FF00]";

/**
 * Agrandissement au survol — le même geste que les cartes de l'app (transform
 * seul, jamais width/height, pour rester à 60 fps). Sur un élément voisin
 * d'autres, ajouter `relative hover:z-10` pour qu'il passe au-dessus.
 */
export const hoverZoom =
  "transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100";

/** Affiche une heure sans secondes (ex. événements perso stockés en HH:MM:SS). */
export function formatTimeForDisplay(time: string): string {
  const t = String(time).trim();
  const m = t.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return m ? m[1] : t;
}
```

---

## `FaqSection.tsx`

50 lignes — `src/components/landing/FaqSection.tsx`

```tsx
import { FAQ_ITEMS } from "./faqData";
import { SITE_URL } from "@/lib/site";

/**
 * Bloc FAQ visible — pas d'accordéon : chaque réponse est dans le DOM au
 * chargement, sinon elle n'est ni indexée ni extraite par les assistants.
 * Chaque question est un <h3> (elle s'insère sous le <h1> de la page).
 */
export function FaqSection() {
  return (
    <div className="space-y-8">
      {FAQ_ITEMS.map((item) => (
        <div key={item.q}>
          <h3 className="font-display text-lg leading-snug sm:text-xl">
            {item.q}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f5f5]/70">
            {item.a}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Balisage `FAQPage` — co-localisé avec le bloc visible ci-dessus, jamais dans
 * un layout partagé : le JSON-LD ne doit apparaître que sur une page dont le
 * contenu principal est cette FAQ, et son texte doit reprendre mot pour mot les
 * réponses affichées (d'où la source commune `FAQ_ITEMS`).
 *
 * Le JSON est passé en enfant texte du <script> plutôt qu'en
 * `dangerouslySetInnerHTML` : les réponses ne contiennent ni `<` ni `&`, donc
 * l'échappement React ne les altère pas et on évite l'API risquée.
 */
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script type="application/ld+json">{JSON.stringify(data)}</script>
  );
}
```

---

## `/faq  (app/…/page.tsx)`

80 lignes — `app/faq/page.tsx`

```tsx
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
              href="mailto:contact@sidekickartists.com"
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
```

---

## `/confidentialite  (app/…/page.tsx)`

259 lignes — `app/confidentialite/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { cn, focusRing } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment SIDEKICK collecte, utilise et protège tes données personnelles, et comment exercer tes droits RGPD.",
  robots: { index: true, follow: true },
};

/**
 * Brouillon de travail : la structure et les engagements par défaut sont posés,
 * les mentions légales précises (identité du responsable, coordonnées, SIRET,
 * durées exactes) restent à compléter — repérées par « [à compléter] ».
 */
const LAST_UPDATED = "à compléter";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#f5f5f5]/70">
        {children}
      </div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#101010] text-[#f5f5f5]">
      <header className="sticky top-0 z-50 border-b border-[rgba(245,245,245,0.12)] bg-[#101010]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="SIDEKICK — accueil"
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
            Légal
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">
            POLITIQUE DE CONFIDENTIALITÉ
          </h1>
          <p className="text-sm text-[#f5f5f5]/50">
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>

        <div className="mt-6 rounded-sm border border-[rgba(240,255,0,0.3)] bg-[rgba(240,255,0,0.05)] p-4 text-xs leading-relaxed text-[#f5f5f5]/70">
          Document en cours de finalisation. Les engagements ci-dessous
          s&apos;appliquent dès aujourd&apos;hui ; les mentions marquées
          «&nbsp;[à compléter]&nbsp;» seront précisées avant la sortie de l&apos;alpha.
        </div>

        <div className="mt-12 space-y-10">
          <Section title="1. Qui est responsable de tes données">
            <p>
              SIDEKICK est édité par [à compléter : nom / raison sociale],
              [à compléter : statut juridique], [à compléter : adresse],
              [à compléter : SIRET].
            </p>
            <p>
              Pour toute question relative à tes données personnelles ou pour
              exercer tes droits :{" "}
              <a
                href="mailto:contact@sidekickartists.com"
                className={cn(
                  "rounded-sm text-[#F0FF00] underline underline-offset-4",
                  focusRing
                )}
              >
                contact@sidekickartists.com
              </a>
              .
            </p>
          </Section>

          <Section title="2. Les données que nous collectons">
            <p>
              <span className="text-[#f5f5f5]/90">Compte.</span> Nom, prénom,
              adresse email, mot de passe (chiffré). Si tu te connectes via
              Google, les informations de profil que Google nous transmet
              (email, nom).
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Contenu que tu saisis.</span>{" "}
              Tout ce que tu crées dans les modules : titres et métadonnées,
              œuvres, dates de concert, contacts, factures, statuts
              administratifs, campagnes, fichiers importés, etc. Ces données
              t&apos;appartiennent.
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Données techniques.</span>{" "}
              Journaux de connexion, type d&apos;appareil et de navigateur,
              pages consultées et interactions, à des fins de sécurité et
              d&apos;amélioration du produit.
            </p>
          </Section>

          <Section title="3. Pourquoi nous les utilisons, et sur quelle base">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Fournir le service et ton compte —{" "}
                <span className="text-[#f5f5f5]/90">exécution du contrat</span>.
              </li>
              <li>
                Sécuriser l&apos;accès et prévenir les abus —{" "}
                <span className="text-[#f5f5f5]/90">intérêt légitime</span>.
              </li>
              <li>
                Mesurer l&apos;usage et améliorer le produit (statistiques) —{" "}
                <span className="text-[#f5f5f5]/90">intérêt légitime</span>, avec
                des données limitées au strict nécessaire.
              </li>
              <li>
                T&apos;envoyer des emails liés au service (confirmation, sécurité,
                changements importants) —{" "}
                <span className="text-[#f5f5f5]/90">exécution du contrat</span>.
              </li>
              <li>
                Respecter nos obligations légales (comptables, fiscales) —{" "}
                <span className="text-[#f5f5f5]/90">obligation légale</span>.
              </li>
            </ul>
            <p>
              Nous ne vendons pas tes données et ne les utilisons pas à des fins
              publicitaires de tiers.
            </p>
          </Section>

          <Section title="4. Hébergement et sous-traitants">
            <p>
              Tes données sont hébergées dans l&apos;Union européenne
              [à compléter : région exacte, ex. Supabase — Francfort].
            </p>
            <p>
              Nous nous appuyons sur des prestataires qui agissent pour notre
              compte, encadrés par contrat :
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-[#f5f5f5]/90">Supabase</span> —
                base de données, authentification et stockage de fichiers
                (hébergement UE).
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">Vercel</span> —
                hébergement de l&apos;application et diffusion des pages.
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">PostHog</span> —
                mesure d&apos;audience et statistiques d&apos;usage
                [à compléter : région d&apos;instance].
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">Brevo</span> —
                envoi des emails transactionnels.
              </li>
            </ul>
            <p>
              Lorsqu&apos;un transfert hors UE est nécessaire, il est encadré par
              les clauses contractuelles types de la Commission européenne.
            </p>
          </Section>

          <Section title="5. Combien de temps nous les conservons">
            <p>
              Tes données de compte et de contenu sont conservées tant que ton
              compte est actif. À la suppression du compte, elles sont effacées
              sous [à compléter : délai, ex. 30 jours], sauf obligation légale de
              conservation (par exemple les pièces comptables :
              [à compléter : durée légale]).
            </p>
            <p>
              Les données de mesure d&apos;audience sont conservées
              [à compléter : durée].
            </p>
          </Section>

          <Section title="6. Tes droits">
            <p>
              Conformément au RGPD, tu disposes des droits d&apos;accès, de
              rectification, d&apos;effacement, de limitation, d&apos;opposition
              et de portabilité de tes données.
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Export.</span> Tu peux demander
              à tout moment une copie de l&apos;ensemble de tes données dans un
              format lisible et réutilisable. Écris-nous, nous te la fournissons
              sous 30 jours au plus.
            </p>
            <p>
              Pour exercer un droit, écris à{" "}
              <a
                href="mailto:contact@sidekickartists.com"
                className={cn(
                  "rounded-sm text-[#F0FF00] underline underline-offset-4",
                  focusRing
                )}
              >
                contact@sidekickartists.com
              </a>
              . Tu peux aussi introduire une réclamation auprès de la CNIL
              (www.cnil.fr).
            </p>
          </Section>

          <Section title="7. Cookies et mesure d'audience">
            <p>
              Nous utilisons un cookie de session pour te garder connecté et un
              outil de mesure d&apos;audience (PostHog) pour comprendre comment
              le produit est utilisé. [à compléter : préciser si la mesure
              d&apos;audience est exemptée de consentement ou soumise à une
              bannière.]
            </p>
          </Section>

          <Section title="8. Modifications">
            <p>
              Cette politique peut évoluer. En cas de changement significatif,
              nous t&apos;en informons par email ou via l&apos;application avant
              son entrée en vigueur.
            </p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
```

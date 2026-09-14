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

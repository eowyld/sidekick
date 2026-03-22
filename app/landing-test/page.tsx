"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Album,
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Megaphone,
  Mic2,
  Repeat,
  Settings,
  Star,
  Users,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  rating: number;
};

type ModuleCard = {
  title: string;
  href: string;
  icon: typeof Album;
  kicker: string;
  details: string[];
  badge?: string;
};

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(!!mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  return reducedMotion;
}

function isValidEmail(email: string) {
  const e = email.trim();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function WaveSeparator() {
  return (
    <div className="pointer-events-none my-0 select-none overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 40C240 10 480 70 720 40C960 10 1200 70 1440 40V80H0V40Z"
          fill="rgba(240,255,0,0.04)"
        />
        <path
          d="M0 50C360 20 720 80 1080 40C1260 20 1350 30 1440 50"
          stroke="rgba(240,255,0,0.12)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}

function GrainOverlay() {
  return null;
}

export default function LandingTestPage() {
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const testimonials: Testimonial[] = useMemo(
    () => [
      {
        quote:
          "Depuis que j’utilise le module Phono, mon catalogue est enfin propre. ISRC, versions, statut de production — tout est sur une fiche. Je ne cherche plus rien.",
        name: "Maïa L.",
        role: "Autrice-compositrice, Paris",
        rating: 5
      },
      {
        quote:
          "Le module Revenus m’a fait gagner un temps fou. Facturation, royalties, droits d’auteur et intermittence au même endroit. Je sais enfin ce que je gagne vraiment.",
        name: "Kaelan R.",
        role: "Producteur, Lyon",
        rating: 5
      },
      {
        quote:
          "Le module Live a changé ma façon de bosser. Répétitions, représentations, rémunération, matériel — tout ce qui touche à la scène est dans un seul endroit.",
        name: "Inès V.",
        role: "Artiste indépendante, Marseille",
        rating: 5
      }
    ],
    []
  );

  const moduleCards: ModuleCard[] = useMemo(
    () => [
      {
        title: "Calendrier",
        href: "/calendar",
        icon: CalendarDays,
        kicker: "Vue mensuelle transversale",
        details: ["Représentations", "Répétitions", "Tâches, factures, sessions"]
      },
      {
        title: "Tâches",
        href: "/tasks",
        icon: Settings,
        kicker: "Tableau des tâches par secteur",
        details: ["Date limite", "Secteur", "Statut — marquer faite"]
      },
      {
        title: "Contacts",
        href: "/contacts",
        icon: Users,
        kicker: "Carnet de contacts",
        details: ["Métier", "Rechercher", "Filtrer par métier"]
      },
      {
        title: "Phono",
        href: "/phono",
        icon: Album,
        kicker: "Catalogue & ISRC",
        details: ["N° ISRC", "Versions (En production → Publié)", "Sessions Studio"]
      },
      {
        title: "Édition",
        href: "/edition",
        icon: FileText,
        kicker: "Œuvres & synchronisation",
        details: ["Œuvres", "Synchronisation"],
        badge: "Bientôt disponible"
      },
      {
        title: "Live",
        href: "/live",
        icon: Mic2,
        kicker: "Scène & tournée",
        details: ["Représentations", "Répétitions", "Rémunération", "Matériel"]
      },
      {
        title: "Marketing",
        href: "/marketing",
        icon: Megaphone,
        kicker: "Mailing & Presskit",
        details: ["Campagnes email", "Liste de diffusion", "Presskit (profils streaming)"]
      },
      {
        title: "Revenus",
        href: "/incomes",
        icon: Wallet,
        kicker: "Facturation & Royalties",
        details: ["Facturation (en attente / payées)", "Royalties", "Droits d’auteur, droits voisins, intermittence"]
      },
      {
        title: "Admin",
        href: "/admin",
        icon: Building2,
        kicker: "Statuts & démarches",
        details: ["Mes statuts", "Mes démarches", "Espace documents"]
      }
    ],
    []
  );

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const tick = (t: number) => {
      if (!running) return;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);

      const time = t / 1000;
      const centerY = h * 0.52;
      const amp = Math.max(12, Math.min(34, h * 0.22));
      const points = 170;

      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "lighter";

      const strokePass = (alpha: number, lineWidth: number) => {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "rgba(240,255,0,1)";
        ctx.beginPath();

        for (let i = 0; i < points; i++) {
          const x = (i / (points - 1)) * w;
          const nx = i / (points - 1);

          // Onde jaune : deux oscillations + une micro-modulation.
          const wave1 = Math.sin(time * 1.25 + nx * 7.4);
          const wave2 = Math.sin(time * 0.75 + nx * 16.0 + Math.sin(time * 0.23) * 1.3);
          const wave3 = Math.sin(time * 2.1 + nx * 2.9) * 0.22;

          const y = centerY + (wave1 * 0.62 + wave2 * 0.26 + wave3) * amp;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      };

      // Glow (plus gros + plus transparent) puis trait net.
      strokePass(0.14, 10);
      strokePass(0.28, 4);
      strokePass(0.55, 2);

      // Petits éclats le long de la ligne (discrets).
      ctx.globalCompositeOperation = "source-over";
      const dotCount = 18;
      for (let d = 0; d < dotCount; d++) {
        const nx = d / (dotCount - 1);
        const x = nx * w;
        const y =
          centerY +
          (Math.sin(time * 1.25 + nx * 7.4) * 0.62 +
            Math.sin(time * 0.75 + nx * 16.0 + Math.sin(time * 0.23) * 1.3) *
              0.26 +
            Math.sin(time * 2.1 + nx * 2.9) * 0.22) *
            amp;

        ctx.fillStyle = "rgba(240,255,0,0.55)";
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(tick);
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (els.length === 0) return;

    if (reducedMotion) {
      els.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0px)";
      });
      return;
    }

    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)";
      el.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.opacity = "1";
          el.style.transform = "translateY(0px)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reducedMotion]);

  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "ok" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setSubmitState("error");
      setSubmitMessage("Entre une adresse email valide.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = (await res.json()) as { ok?: boolean; persisted?: boolean; error?: string };

      if (res.ok && data.ok) {
        setSubmitState("ok");
        setSubmitMessage(
          data.persisted
            ? "Nickel. Tu es sur la liste."
            : "Merci ! Nous avons bien reçu ta demande."
        );
        return;
      }

      setSubmitState("error");
      if (data.error === "webhook_rejected" || data.error === "webhook_failed") {
        setSubmitMessage("Envoi impossible pour le moment. Réessaie plus tard ou contacte-nous.");
      } else {
        setSubmitMessage("Une erreur est survenue. Réessaie dans un instant.");
      }
    } catch {
      setSubmitState("error");
      setSubmitMessage("Pas de connexion. Vérifie le réseau et réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  const scrollToEmail = () => scrollTo("email-section");

  /** Hash #get-access ou redirect serveur ?early-access=1 → formulaire (les # ne suivent pas toujours les redirects HTTP). */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const go = () => {
      requestAnimationFrame(() => {
        const el = document.getElementById("email-section");
        el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      });
    };

    if (window.location.hash === "#get-access") {
      go();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("early-access") === "1") {
      go();
      params.delete("early-access");
      const q = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    }
  }, [reducedMotion]);

  const FONT_URL = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONT_URL} />

      <style>{`
        .font-display { font-family: 'Bebas Neue', system-ui, sans-serif; }
        .font-body { font-family: 'DM Sans', system-ui, sans-serif; }
        .btn-glow { border-radius: 2px; transition: box-shadow 200ms ease, background-color 200ms ease; }
        .btn-glow:hover { box-shadow: 0 0 24px rgba(240,255,0,0.5), 0 0 6px rgba(240,255,0,0.3); }
        .card-hover { transition: border-color 300ms ease, box-shadow 300ms ease, border-top-color 300ms ease; border-top: 2px solid transparent; }
        .card-hover:hover { border-top-color: #F0FF00; box-shadow: 0 8px 32px rgba(240,255,0,0.08); }
      `}</style>

      <main className="font-body min-h-screen scroll-smooth bg-[#101010] text-[#f5f5f5]">

        {/* ═══ HERO ═══ */}
        <div className="relative overflow-hidden bg-black">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70">
            <canvas ref={canvasRef} className="h-full w-full" />
          </div>

          <div className="relative mx-auto flex max-w-6xl flex-col px-6 pb-28 pt-6 md:pt-8">

            <header className="flex items-center justify-between gap-4 pb-10 md:pb-14">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl tracking-wide">SIDEKICK</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild className="btn-glow">
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button
                  size="sm"
                  type="button"
                  className="btn-glow"
                  onClick={scrollToEmail}
                >
                  Demander un accès <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </header>

            <section className="grid items-start gap-8 md:grid-cols-[1.3fr,1fr] md:gap-10">
              {/* Bloc manage au tout début */}
              <div
                className="md:col-span-2"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
                data-reveal
              >
                <h1 className="font-display whitespace-nowrap text-4xl leading-[0.95] tracking-wide sm:text-5xl md:text-6xl lg:text-7xl">
                  ARRÊTE DE GÉRER TA CARRIÈRE DANS{" "}
                  <span className="text-[#F0FF00]">12 APPLIS.</span>
                </h1>

                <h3 className="font-display text-3xl tracking-wide">
                  <span className="text-[#F0FF00]">SIDEKICK</span> : UN MANAGER tout-en-un
                </h3>

                <p className="max-w-[52ch] text-xs leading-relaxed text-[#f5f5f5]/60">
                  Pour les artistes qui font tout eux-mêmes, et qui veulent le faire bien.
                </p>

                <ul style={{ display: "flex", flexDirection: "column", gap: 10 }} className="text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#F0FF00]" />
                    <span>Ta musique : cataloguée, distribuée, sous contrôle</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#F0FF00]" />
                    <span>Ton agenda : structuré, sans rien oublier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#F0FF00]" />
                    <span>Ton argent : tracé, compris, sans surprise</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#F0FF00]" />
                    <span>Ta carrière : pilotée, pas subie</span>
                  </li>
                </ul>

              </div>

              {/* Le reste (titre + CTA) */}
              <div
                className="flex flex-col"
                style={{ gap: 6 }}
                data-reveal
              >
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    size="lg"
                    type="button"
                    className="btn-glow gap-2 rounded-sm"
                    onClick={scrollToEmail}
                  >
                    Demander un accès <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" asChild className="btn-glow gap-2 rounded-sm">
                    <Link href="/login">Connexion</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-[#f5f5f5]/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F0FF00]" />
                    <span>Gratuit pour tester</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F0FF00]" />
                    <span>Aucune carte bancaire</span>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={() => scrollTo("modules")}
              className="mx-auto mt-10 flex flex-col items-center gap-2 text-xs text-[#f5f5f5]/40 transition-colors hover:text-[#F0FF00]"
              aria-label="Défiler vers les modules"
            >
              <span>Découvrir</span>
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </button>
          </div>
        </div>

        <WaveSeparator />

        {/* ═══ MODULES ═══ */}
        <div className="mx-auto max-w-6xl px-6 py-28">
          <section id="modules" className="space-y-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3" data-reveal>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  MODULES
                </p>
                <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
                  TOUT DANS UN SEUL <span className="text-[#F0FF00]">SIDEKICK</span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#f5f5f5]/60" data-reveal>
                Commence par un module. Le vrai gain, c&apos;est quand tout est relié.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {moduleCards.map((m) => {
                const Icon = m.icon;
                return (
                  <Card
                    key={m.title}
                    className="card-hover h-full p-7"
                    data-reveal
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)]">
                            <Icon className="h-4 w-4 text-[#F0FF00]" />
                          </span>
                          <p className="font-semibold">{m.title}</p>
                        </div>
                        <p className="text-xs text-[#f5f5f5]/60">{m.kicker}</p>
                      </div>
                      {m.badge && (
                        <span className="shrink-0 rounded-sm bg-[#F0FF00]/10 px-2 py-0.5 text-[10px] font-medium text-[#F0FF00]">
                          {m.badge}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 overflow-hidden rounded-sm border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]">
                      <ul className="space-y-2 p-5 text-xs">
                        {m.details.map((d) => (
                          <li key={d} className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-[#F0FF00]" />
                            <span className="text-[#f5f5f5]/75">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <WaveSeparator />

        {/* ═══ PAIN POINTS ═══ */}
        <div className="mx-auto max-w-6xl px-6 py-28">
          <section className="space-y-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3" data-reveal>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  TU RECONNAIS ÇA ?
                </p>
                <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
                  TON BACK-OFFICE TE <span className="text-[#F0FF00]">COUPE</span> DE TA MUSIQUE
                </h2>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                "Tes relevés de royalties sont noyés dans 5 boîtes mail différentes",
                "Tes dates de concert dans Notes, ton budget dans Excel, tes contrats dans Gmail",
                "Tu as envoyé la mauvaise version du morceau au label. Encore.",
                "Ta facture, c’est un Word doc que tu modifies à la main depuis 2 ans",
                "Tu gères ton statut auto-entrepreneur entre deux répétitions",
                "Ton presskit, c’est un PDF que tu n’as pas mis à jour depuis 6 mois"
              ].map((p) => (
                <Card key={p} className="card-hover p-7" data-reveal>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#F0FF00]" />
                    </span>
                    <p className="text-sm leading-relaxed text-[#f5f5f5]/80">{p}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <WaveSeparator />

        {/* ═══ DEEP DIVES — asymmetric layout ═══ */}
        <div className="mx-auto max-w-6xl px-6 py-28">
          <section className="space-y-14">
            <div className="max-w-2xl space-y-3" data-reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                POURQUOI SIDEKICK ?
              </p>
              <h2 className="font-display text-4xl tracking-wide sm:text-5xl md:text-6xl">
                PAS UN LOGICIEL
                <br />
                <span className="text-[#F0FF00]">DE PLUS.</span>
              </h2>
              <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
                Trois modules qui changent concrètement ta façon de travailler.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr,1.2fr]">
              <Card className="card-hover p-7" data-reveal>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="font-display text-2xl tracking-wide">PHONO</p>
                    <p className="text-sm leading-relaxed text-[#f5f5f5]/70">
                      Chaque morceau a une fiche : ISRC, versions, statut de production, sessions studio. Ton catalogue, enfin propre.
                    </p>
                  </div>
                  <Album className="h-6 w-6 shrink-0 text-[#F0FF00]" />
                </div>
                <div className="mt-6 space-y-2 rounded-sm border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] p-4">
                  <p className="text-xs font-medium text-[#f5f5f5]/80">Statut de production</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {["En production", "Mixé", "Mastérisé", "Publié"].map((s) => (
                      <span key={s} className="rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)] px-2 py-0.5 text-[#f5f5f5]/60">{s}</span>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="flex flex-col gap-6">
                <Card className="card-hover flex-1 p-7" data-reveal>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-display text-2xl tracking-wide">REVENUS</p>
                      <p className="text-sm leading-relaxed text-[#f5f5f5]/70">
                        Factures, royalties, droits d&apos;auteur et intermittence au même endroit. Une vue d&apos;ensemble de ce que tu gagnes vraiment.
                      </p>
                    </div>
                    <Wallet className="h-6 w-6 shrink-0 text-[#F0FF00]" />
                  </div>
                  <div className="mt-6 space-y-2 rounded-sm border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] p-4 text-[11px] text-[#f5f5f5]/60">
                    <p>Facturation : en attente / payées</p>
                    <p>Royalties + Droits d&apos;auteur</p>
                    <p>Droits voisins + Intermittence</p>
                  </div>
                </Card>

                <Card className="card-hover flex-1 p-7" data-reveal>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-display text-2xl tracking-wide">LIVE</p>
                      <p className="text-sm leading-relaxed text-[#f5f5f5]/70">
                        Répétitions, représentations, rémunération, matériel. Tout ce qui touche à la scène, centralisé.
                      </p>
                    </div>
                    <Mic2 className="h-6 w-6 shrink-0 text-[#F0FF00]" />
                  </div>
                  <div className="mt-6 space-y-2 rounded-sm border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] p-4 text-[11px] text-[#f5f5f5]/60">
                    <p>Représentations &middot; Carte des événements</p>
                    <p>Répétitions &middot; Rémunération</p>
                    <p>Matériel</p>
                  </div>
                </Card>
              </div>
            </div>
          </section>
        </div>

        <WaveSeparator />

        {/* ═══ SOCIAL PROOF ═══ */}
        <div className="mx-auto max-w-6xl px-6 py-28">
          <section className="space-y-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3" data-reveal>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  AVIS D&apos;ARTISTES
                </p>
                <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
                  QUAND LE BACK-OFFICE S&apos;ARRÊTE
                  <br />
                  DE TE <span className="text-[#F0FF00]">RALENTIR</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm text-[#f5f5f5]/50" data-reveal>
                Des retours de personnes qui géraient leurs projets dans trop d&apos;outils à la fois.
              </p>
            </div>

            <div className="mx-0 overflow-x-auto pb-2" data-reveal>
              <div className="flex snap-x snap-mandatory gap-7 px-4">
                {testimonials.map((t, idx) => (
                  <Card key={idx} className="card-hover min-w-[340px] snap-start p-7">
                    <div className="flex items-center gap-1 text-[#F0FF00]">
                      {Array.from({ length: t.rating }).map((_, starIdx) => (
                        <Star key={starIdx} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-[#f5f5f5]/80">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-5 border-t border-[rgba(245,245,245,0.08)] pt-4">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-[#f5f5f5]/50">{t.role}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>

        <WaveSeparator />

        {/* ═══ PRICING ═══ */}
        <div className="mx-auto max-w-6xl px-6 py-28">
          <section id="pricing" className="space-y-14">
            <div className="space-y-3" data-reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                TARIFS (APERÇU)
              </p>
              <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
                Simple. Pas un <span className="text-[#F0FF00]">accord</span> avec un label.
              </h2>
              <p className="max-w-xl text-sm text-[#f5f5f5]/60">
                Ces niveaux sont des placeholders : l&apos;objectif est de poser les attentes, pas de te vendre un produit flou.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  name: "Gratuit",
                  price: "0 €",
                  desc: "Pour tester ton Sidekick et connecter ton projet.",
                  bullets: ["Tableau de bord", "Phono", "Calendrier"],
                  cta: "Demander l’accès"
                },
                {
                  name: "Pro",
                  price: "12 €",
                  desc: "Le mode « je gère vraiment ma carrière ».",
                  bullets: ["Revenus", "Live", "Marketing"],
                  cta: "Passer à Pro"
                },
                {
                  name: "Studio",
                  price: "25 €",
                  desc: "Pour les tournées et les équipes qui avancent vite.",
                  bullets: ["Admin", "Contacts", "Tous les modules"],
                  cta: "En parler"
                }
              ].map((plan) => (
                <Card key={plan.name} className="card-hover p-7" data-reveal>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-display text-2xl tracking-wide">{plan.name.toUpperCase()}</p>
                      <span className="shrink-0 rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)] px-2.5 py-1 text-sm font-semibold text-[#F0FF00]">
                        {plan.price}
                      </span>
                    </div>
                    <p className="text-xs text-[#f5f5f5]/60">{plan.desc}</p>
                    <ul className="space-y-2 pt-2 text-xs">
                      {plan.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-[#F0FF00]" />
                          <span className="text-[#f5f5f5]/75">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6">
                    <Button
                      size="lg"
                      type="button"
                      className="btn-glow w-full gap-2 rounded-sm"
                      onClick={scrollToEmail}
                    >
                      {plan.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <WaveSeparator />

        {/* ═══ FINAL CTA ═══ */}
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24">
          <section id="email-section" className="space-y-8">
            <div id="get-access" aria-hidden="true" />
            <Card className="p-8 md:p-12" data-reveal>
              <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
                <div className="max-w-lg space-y-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                    PROCHAIN PAS
                  </p>
                  <h3 className="font-display text-3xl tracking-wide sm:text-4xl">
                    BLOQUE 30 MINUTES.
                    <br />
                    <span className="text-[#F0FF00]">REPRENDS LA MAIN.</span>
                  </h3>
                  <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
                    Crée ton espace. Choisis un projet. Rentre tes dates, sorties et échéances.
                    Sidekick t&apos;indique où agir dès cette semaine.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="w-full space-y-4 sm:max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="email-cta" className="text-xs text-[#f5f5f5]/60">Email</Label>
                    <Input
                      id="email-cta"
                      type="email"
                      placeholder="ton.email@exemple.fr"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (submitState !== "idle") {
                          setSubmitState("idle");
                          setSubmitMessage("");
                        }
                      }}
                      aria-invalid={submitState === "error" ? "true" : "false"}
                      aria-describedby="email-cta-help"
                      required
                      className="rounded-sm"
                    />
                  </div>

                  <Button
                    size="lg"
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-glow w-full gap-2 rounded-sm"
                  >
                    {isSubmitting ? "Envoi…" : "Accès en avant-première"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {submitState !== "idle" && (
                    <p
                      id="email-cta-help"
                      className={`text-xs ${submitState === "error" ? "text-rose-300" : "text-[#F0FF00]"}`}
                      role={submitState === "error" ? "alert" : "status"}
                    >
                      {submitMessage}
                    </p>
                  )}

                  {submitState === "idle" && (
                    <p id="email-cta-help" className="text-[11px] text-[#f5f5f5]/40">
                      Pas de carte bancaire. Juste une liste pour te prévenir.
                    </p>
                  )}

                  <div className="pt-1">
                    <Button variant="outline" size="lg" className="btn-glow w-full gap-2 rounded-sm" asChild>
                      <Link href="/login">
                        Connexion <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </form>
              </div>
            </Card>

            <p className="text-center text-[11px] text-[#f5f5f5]/30">
              Pas un CRM générique, pas un tableur de plus. Un espace de travail fait pour gérer ta carrière.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

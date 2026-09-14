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

          {/* Une phrase sur la dispersion ouvre, avant l'énumération. */}
          <div className="max-w-xl text-base leading-relaxed text-[#f5f5f5]/70">
            <p>
              Aujourd&apos;hui, elle est éparpillée dans un nombre incalculable
              d&apos;outils qui ne se parlent pas.
            </p>
            <p>
              Royalties, factures, démarches administratives, catalogue de tes
              titres, dates de tournée, presskit… Dix modules reliés entre eux,
              pensés pour les artistes qui font tout eux-mêmes.
            </p>
          </div>

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

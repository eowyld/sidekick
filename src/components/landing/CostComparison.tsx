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

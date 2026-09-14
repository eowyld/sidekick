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

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

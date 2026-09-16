import Link from "next/link";
import { MIN_AGE } from "@/lib/legal";

const LINK =
  "text-[#f5f5f5]/75 underline decoration-[rgba(245,245,245,0.3)] underline-offset-2 transition-colors hover:text-[#F0FF00]";

/**
 * Mention d'acceptation des CGU. Affichée à l'inscription et sur la connexion :
 * le bouton Google de /login crée aussi un compte quand l'adresse est inconnue.
 */
export function TermsNotice() {
  return (
    <p className="text-center text-xs leading-relaxed text-[#f5f5f5]/50">
      En créant un compte, tu confirmes avoir au moins {MIN_AGE}{" "}ans et
      acceptes les{" "}
      <Link href="/cgu" target="_blank" className={LINK}>
        conditions d&apos;utilisation
      </Link>
      . Tes données sont traitées selon la{" "}
      <Link href="/confidentialite" target="_blank" className={LINK}>
        politique de confidentialité
      </Link>
      .
    </p>
  );
}

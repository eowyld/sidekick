import type { Metadata } from "next";
import {
  ContactEmail,
  LegalLink,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { LEGAL_EDITOR, LEGAL_HOST, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, directeur de la publication et hébergeur du site SIDEKICK.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  const e = LEGAL_EDITOR;
  return (
    <LegalPage title="Mentions légales" updated={LEGAL_UPDATED.mentions}>
      <LegalSection title="Éditeur">
        <p>
          Le site sidekickartists.com et l&apos;application SIDEKICK sont édités
          par <span className="text-[#f5f5f5]/90">{e.companyName}</span>,{" "}
          {e.legalForm}{" "}au capital de {e.shareCapital}&nbsp;€, immatriculée au{" "}
          {e.rcs}, dont le siège social est situé {e.address}.
        </p>
        {e.vatNumber && <p>Numéro de TVA intracommunautaire : {e.vatNumber}.</p>}
        <p>
          Contact : <ContactEmail />, téléphone : {e.phone}.
        </p>
        <p>Directeur de la publication : {e.publicationDirector}, Président.</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Site et application : {LEGAL_HOST.name}, {LEGAL_HOST.address}, téléphone{" "}{LEGAL_HOST.phone}{" "}(
          <LegalLink href={LEGAL_HOST.website}>vercel.com</LegalLink>).
        </p>
        <p>
          Base de données, comptes et fichiers : Supabase, Inc., sur des serveurs
          situés à Paris (région AWS eu-west-3).
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La marque SIDEKICK, le logo, les textes, l&apos;interface et le code du
          site sont la propriété de l&apos;éditeur. Toute reproduction sans
          autorisation écrite est interdite.
        </p>
        <p>
          Les contenus que les utilisateurs déposent dans l&apos;application
          restent leur propriété. Voir les{" "}
          <LegalLink href="/cgu">conditions générales d&apos;utilisation</LegalLink>.
        </p>
        <p>
          SACEM, France Travail, URSSAF, Spotify et les autres noms cités sont
          des marques de leurs titulaires respectifs. Leur mention sert
          uniquement à décrire des usages et n&apos;implique aucun partenariat.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Voir la{" "}
          <LegalLink href="/confidentialite">politique de confidentialité</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import {
  ContactEmail,
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  Strong,
} from "@/components/legal/LegalPage";
import { LEGAL_EDITOR, LEGAL_UPDATED, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment SIDEKICK collecte, utilise et protège tes données personnelles, et comment exercer tes droits RGPD.",
  alternates: { canonical: "/confidentialite" },
  robots: { index: true, follow: true },
};

/*
 * Chaque affirmation de cette page doit rester vraie dans le code : si un
 * prestataire, une durée ou un flux de données change, cette page change dans
 * le même commit. Registre interne correspondant : docs/legal/registre-rgpd.md.
 */

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updated={LEGAL_UPDATED.confidentialite}
      intro={
        <div className="space-y-3 rounded-sm border border-[rgba(240,255,0,0.3)] bg-[rgba(240,255,0,0.05)] p-4">
          <p className="text-[#f5f5f5]/90">En bref</p>
          <LegalList>
            <li>Tes données t&apos;appartiennent. On ne les vend pas, on ne fait pas de pub avec.</li>
            <li>Elles sont hébergées à Paris.</li>
            <li>Aucune mesure d&apos;audience sans ton accord.</li>
            <li>Aucune donnée n&apos;est envoyée à un service d&apos;intelligence artificielle.</li>
            <li>Export ou suppression de ton compte sur simple email.</li>
          </LegalList>
        </div>
      }
    >
      <LegalSection title="1. Qui est responsable de tes données">
        <p>
          {LEGAL_EDITOR.companyName}, éditeur de SIDEKICK (coordonnées complètes
          dans les <LegalLink href="/mentions-legales">mentions légales</LegalLink>
          ), est responsable des traitements décrits ici.
        </p>
        <p>
          Pour toute question sur tes données ou pour exercer tes droits :{" "}
          <ContactEmail />.
        </p>
        <p>
          Exception : pour les données de tiers que tu saisis toi-même (tes
          contacts, coauteurs, clients), c&apos;est toi le responsable et
          SIDEKICK agit pour ton compte. Voir l&apos;
          <LegalLink href="/cgu#annexe">annexe des CGU</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="2. Ce que nous collectons">
        <p>
          <Strong>Ton compte.</Strong>{" "}Prénom, nom, adresse email, mot de passe
          (jamais stocké en clair), secteurs choisis à l&apos;inscription,
          préférences. Si tu te connectes avec Google : l&apos;email, le nom et
          l&apos;identifiant que Google nous transmet.
        </p>
        <p>
          <Strong>Ce que tu mets dans l&apos;application.</Strong>{" "}Projets,
          titres, fichiers audio et pochettes, œuvres et répartitions, dates de
          concert, contacts, factures, revenus et relevés, statuts
          administratifs, démarches, documents déposés. Ces contenus
          t&apos;appartiennent.
        </p>
        <p>
          <Strong>Connexion Gmail, si tu l&apos;actives.</Strong>{" "}Une
          autorisation d&apos;envoi d&apos;emails depuis ton adresse et
          l&apos;adresse elle-même. Nous ne lisons pas ta boîte de réception :
          l&apos;autorisation demandée ne le permet pas. Les données obtenues
          via les API Google ne servent qu&apos;à envoyer les messages que tu
          déclenches, et ne sont ni cédées ni utilisées à d&apos;autres fins.
        </p>
        <p>
          <Strong>Données techniques.</Strong>{" "}Journaux de connexion et
          d&apos;erreurs (adresse IP, date, navigateur), nécessaires à la
          sécurité du service.
        </p>
        <p>
          <Strong>Mesure d&apos;audience, avec ton accord uniquement.</Strong>{" "}
          Pages vues, clics, enregistrements de session où tout ce que tu tapes
          est masqué. Détail en section 8.
        </p>
        <p>
          <Strong>Échanges avec nous.</Strong>{" "}Le contenu des emails que tu nous
          écris.
        </p>
      </LegalSection>

      <LegalSection title="3. Pourquoi, et sur quelle base légale">
        <LegalList>
          <li>
            Créer et faire fonctionner ton compte, héberger tes contenus,
            générer tes liens d&apos;écoute et documents :{" "}
            <Strong>exécution du contrat</Strong>{" "}(les CGU).
          </li>
          <li>
            T&apos;envoyer les emails du service (confirmation, mot de passe,
            changement important) : <Strong>exécution du contrat</Strong>.
          </li>
          <li>
            T&apos;envoyer les rappels de démarches à échéance :{" "}
            <Strong>exécution du contrat</Strong>. Tu peux les couper dans
            Réglages &gt; Personnalisation.
          </li>
          <li>
            Sécuriser le service, prévenir les abus, garder une trace des
            connexions : <Strong>intérêt légitime</Strong>{" "}et{" "}
            <Strong>obligation légale</Strong>.
          </li>
          <li>
            Mesurer l&apos;usage pour améliorer le produit :{" "}
            <Strong>consentement</Strong>.
          </li>
          <li>
            Te répondre quand tu nous écris : <Strong>intérêt légitime</Strong>.
          </li>
        </LegalList>
        <p>
          Nous ne vendons pas tes données, ne les utilisons pas pour de la
          publicité et ne prenons aucune décision automatisée qui aurait un
          effet juridique sur toi.
        </p>
      </LegalSection>

      <LegalSection id="sous-traitants" title="4. Hébergement et prestataires">
        <p>
          Tes données sont stockées à <Strong>Paris</Strong>. Seuls les
          prestataires ci-dessous y ont accès, uniquement pour ce qui est
          nécessaire à leur mission, et sous contrat :
        </p>
        <LegalList>
          <li>
            <Strong>Supabase</Strong>{" "}: base de données, comptes et fichiers.
            Serveurs à Paris (AWS eu-west-3).
          </li>
          <li>
            <Strong>Vercel</Strong>{" "}: hébergement et affichage de
            l&apos;application. Société américaine.
          </li>
          <li>
            <Strong>Brevo</Strong>{" "}: envoi des emails du service. Société
            française, serveurs en Union européenne.
          </li>
          <li>
            <Strong>PostHog</Strong>{" "}: mesure d&apos;audience, si tu
            l&apos;acceptes. Instance hébergée dans l&apos;Union européenne.
          </li>
          <li>
            <Strong>Neo</Strong>{" "}: messagerie de l&apos;adresse de contact, pour
            les emails que tu nous envoies.
          </li>
          <li>
            <Strong>Google</Strong>{" "}: uniquement si tu choisis la connexion avec
            Google ou la connexion Gmail. Google agit alors aussi selon ses
            propres règles de confidentialité.
          </li>
        </LegalList>
        <p>
          Certains de ces prestataires sont des sociétés établies hors de
          l&apos;Union européenne et peuvent accéder aux données depuis
          l&apos;étranger, par exemple pour leur support technique. Ces
          transferts sont encadrés par le cadre de protection des données
          UE–États-Unis lorsque le prestataire y est certifié, et à défaut par
          les clauses contractuelles types de la Commission européenne.
        </p>
      </LegalSection>

      <LegalSection title="5. Combien de temps nous les gardons">
        <LegalList>
          <li>
            <Strong>Compte et contenus :</Strong>{" "}tant que ton compte existe. À
            ta demande de suppression, effacement sous 30 jours, sauvegardes
            comprises. Un compte inactif depuis 3 ans est supprimé, après un
            email de prévenance.
          </li>
          <li>
            <Strong>Journaux de connexion :</Strong>{" "}12 mois au plus.
          </li>
          <li>
            <Strong>Mesure d&apos;audience :</Strong>{" "}cookie valable 13 mois au
            plus ; événements conservés 25 mois au plus, enregistrements de
            session 3 mois au plus.
          </li>
          <li>
            <Strong>Liens d&apos;écoute :</Strong>{" "}les statistiques
            d&apos;écoute sont effacées avec le lien ou avec le compte.
          </li>
          <li>
            <Strong>Emails échangés avec nous :</Strong>{" "}3 ans après le dernier
            échange.
          </li>
        </LegalList>
        <p>
          Les factures que tu émets depuis SIDEKICK sont tes documents : la loi
          t&apos;impose de les conserver 10 ans. Télécharge-les avant de
          supprimer ton compte, nous ne les gardons pas pour toi.
        </p>
      </LegalSection>

      <LegalSection id="securite" title="6. Sécurité de tes fichiers et de tes données">
        <p>
          Un master qui fuit avant sa sortie, un contrat qui circule : on sait
          ce que ça coûte à un artiste. La protection est pensée pour ça.
        </p>
        <LegalList>
          <li>
            <Strong>Fichiers privés.</Strong>{" "}Tes fichiers (audio, contrats,
            documents) n&apos;ont aucune adresse publique. Chaque ouverture
            vérifie que tu es connecté et que le fichier est bien à toi, puis
            délivre un lien qui expire au bout d&apos;une minute. Un lien copié
            ne fonctionne pas pour quelqu&apos;un d&apos;autre.
          </li>
          <li>
            <Strong>Liens d&apos;écoute sous ton contrôle.</Strong>{" "}Tu choisis
            à qui tu les envoies, tu peux leur fixer une date d&apos;expiration,
            un mot de passe, interdire le téléchargement, et les couper à tout
            moment. Tu vois qui a ouvert et écouté.
          </li>
          <li>
            <Strong>Cloisonnement.</Strong>{" "}Chaque compte n&apos;accède
            qu&apos;à ses propres données, contrôle appliqué directement par la
            base de données.
          </li>
          <li>
            <Strong>Chiffrement.</Strong>{" "}Connexions chiffrées (HTTPS), mots
            de passe hachés, jamais stockés en clair.
          </li>
          <li>
            <Strong>Discrétion.</Strong>{" "}Adresses IP des visiteurs de liens
            d&apos;écoute stockées sous forme d&apos;empreinte, champs de saisie
            masqués dans les enregistrements de session, aucune donnée envoyée à
            une intelligence artificielle.
          </li>
        </LegalList>
        <p>
          En cas de violation de données présentant un risque pour toi, nous te
          prévenons et informons la CNIL dans les délais prévus par le RGPD.
        </p>
      </LegalSection>

      <LegalSection title="7. Tes droits">
        <p>
          Tu peux à tout moment accéder à tes données, les rectifier, les
          effacer, en limiter l&apos;usage, t&apos;opposer à un traitement fondé
          sur l&apos;intérêt légitime, retirer ton consentement, et récupérer
          tes données dans un format réutilisable (portabilité). Tu peux aussi
          définir des directives sur le sort de tes données après ton décès.
        </p>
        <p>
          Écris à <ContactEmail />, de préférence depuis l&apos;adresse de ton
          compte, pour qu&apos;on puisse vérifier que c&apos;est bien toi. Nous
          répondons sous un mois au plus.
        </p>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la
          CNIL (<LegalLink href="https://www.cnil.fr">cnil.fr</LegalLink>).
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies et mesure d'audience">
        <p>
          <Strong>Indispensables, sans accord requis :</Strong>{" "}la session qui
          te garde connecté, et la mémorisation de ton choix sur les cookies.
        </p>
        <p>
          <Strong>Mesure d&apos;audience (PostHog), soumise à ton accord</Strong>{" "}
          via le bandeau affiché à ta première visite. Tant que tu n&apos;as pas
          accepté, aucun cookie de mesure n&apos;est déposé et aucune donnée
          d&apos;usage n&apos;est envoyée. Si tu acceptes : pages vues, clics,
          erreurs techniques et enregistrements de session, où le contenu de
          tous les champs de saisie est masqué. Une fois connecté, ces mesures
          sont rattachées à ton compte (identifiant et email).
        </p>
        <p>
          Refuser n&apos;a aucune conséquence sur l&apos;accès au service. Tu
          peux changer d&apos;avis à tout moment :{" "}
          <CookieSettingsButton className="text-[#F0FF00] underline underline-offset-2" />
          .
        </p>
      </LegalSection>

      <LegalSection id="ecoute" title="9. Tu as reçu un lien d'écoute">
        <p>
          Un artiste utilisant SIDEKICK t&apos;a envoyé un lien pour écouter ses
          titres. C&apos;est cet artiste qui est responsable de l&apos;envoi et
          qui voit les statistiques ; SIDEKICK les traite pour son compte.
        </p>
        <p>
          Sont enregistrés : le nom que tu indiques (facultatif), ton adresse
          email si l&apos;artiste t&apos;a invité nommément, la date
          d&apos;ouverture, ton navigateur, une empreinte de ton adresse IP (pas
          l&apos;adresse elle-même), les titres écoutés, la durée d&apos;écoute
          et les téléchargements. Aucun cookie de mesure n&apos;est déposé sans
          ton accord.
        </p>
        <p>
          Pour exercer tes droits, adresse-toi à l&apos;artiste, ou écris-nous à{" "}
          <ContactEmail />{" "}et nous transmettrons.
        </p>
      </LegalSection>

      <LegalSection title="10. Âge minimum">
        <p>
          SIDEKICK est réservé aux personnes de {MIN_AGE}{" "}ans et plus. Si nous
          apprenons qu&apos;un compte appartient à une personne mineure, nous le
          supprimons avec ses données.
        </p>
      </LegalSection>

      <LegalSection title="11. Modifications">
        <p>
          Cette politique évolue avec le produit. Avant tout changement
          important (nouveau prestataire, nouvel usage de tes données), nous te
          prévenons par email au moins 30 jours à l&apos;avance.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

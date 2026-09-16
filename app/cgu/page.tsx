import type { Metadata } from "next";
import {
  ContactEmail,
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
  Strong,
} from "@/components/legal/LegalPage";
import { LEGAL_EDITOR, LEGAL_MEDIATOR, LEGAL_UPDATED, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Les règles d'utilisation de SIDEKICK pendant l'alpha : compte, contenus, données, responsabilités.",
  alternates: { canonical: "/cgu" },
  robots: { index: true, follow: true },
};

export default function CguPage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      updated={LEGAL_UPDATED.cgu}
      intro={
        <p>
          Les présentes conditions générales d&apos;utilisation (les « CGU »)
          encadrent l&apos;utilisation de SIDEKICK pendant sa phase alpha,
          gratuite. Elles seront complétées par des conditions générales de vente
          le jour où une offre payante sera proposée ; aucune somme ne peut vous
          être demandée d&apos;ici là.
        </p>
      }
    >
      <LegalSection title="1. Objet et acceptation">
        <p>
          SIDEKICK (le « Service ») est une application en ligne d&apos;aide à la
          gestion de l&apos;activité des artistes musicaux : organisation,
          projets, catalogue phonographique et éditorial, dates de concert,
          revenus, facturation et suivi des démarches administratives.
        </p>
        <p>
          Le Service est édité par {LEGAL_EDITOR.companyName}{" "}(l&apos;« Éditeur »),
          dont l&apos;identité complète figure dans les{" "}
          <LegalLink href="/mentions-legales">mentions légales</LegalLink>.
        </p>
        <p>
          La création d&apos;un compte emporte l&apos;acceptation sans réserve des
          CGU et la prise de connaissance de la{" "}
          <LegalLink href="/confidentialite">politique de confidentialité</LegalLink>.
          Les CGU applicables sont celles en ligne à la date d&apos;utilisation.
        </p>
      </LegalSection>

      <LegalSection title="2. Phase alpha">
        <p>
          Le Service est en cours de développement. Pendant l&apos;alpha :
        </p>
        <LegalList>
          <li>
            son accès est <Strong>gratuit</Strong>, sans moyen de paiement
            demandé ;
          </li>
          <li>
            ses fonctionnalités peuvent évoluer, être modifiées ou retirées, et
            des anomalies peuvent survenir ;
          </li>
          <li>
            les fonctionnalités signalées « Bientôt » ou « Disponible
            prochainement » ne sont pas incluses et ne constituent pas un
            engagement de livraison.
          </li>
        </LegalList>
        <p>
          La fin de la gratuité sera annoncée par email au moins{" "}
          <Strong>30 jours</Strong>{" "}à l&apos;avance. Aucun abonnement payant ne
          pourra être souscrit sans action expresse de votre part : à défaut,
          votre compte ne sera jamais facturé.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte">
        <p>
          Le Service est réservé aux personnes physiques âgées d&apos;
          <Strong>au moins {MIN_AGE}{" "}ans</Strong>. En créant un compte, vous
          déclarez remplir cette condition. L&apos;Éditeur peut supprimer tout
          compte ouvert par une personne mineure dès qu&apos;il en a
          connaissance.
        </p>
        <p>
          Le compte est créé avec une adresse email et un mot de passe, ou via
          un compte Google. Vous vous engagez à fournir des informations exactes
          et à garder vos identifiants confidentiels. Toute action effectuée
          depuis votre compte est réputée faite par vous. En cas de perte
          d&apos;accès ou d&apos;usage frauduleux, écrivez sans délai à{" "}
          <ContactEmail />.
        </p>
        <p>Un compte est personnel et ne peut être cédé.</p>
      </LegalSection>

      <LegalSection id="absence-de-conseil" title="4. SIDEKICK n'est pas un conseil">
        <p>
          Le Service est un outil d&apos;organisation. L&apos;Éditeur
          n&apos;est ni avocat, ni expert-comptable, ni conseiller en gestion,
          ni organisme de gestion collective, ni éditeur de musique, ni
          mandataire de la SACEM, de l&apos;URSSAF, de France Travail ou de tout
          autre organisme.
        </p>
        <p>En conséquence :</p>
        <LegalList>
          <li>
            les calculs, estimations, seuils et indicateurs affichés (heures
            d&apos;intermittence, allocations, chiffre d&apos;affaires, répartitions
            de droits, revenus prévisionnels) sont <Strong>indicatifs</Strong>{" "}et
            dépendent des données que vous saisissez ;
          </li>
          <li>
            les démarches, échéances et rappels proposés sont une aide : ils ne
            sont ni exhaustifs, ni adaptés à chaque situation, et la
            réglementation peut changer. Vous restez seul responsable du respect
            de vos obligations déclaratives, sociales et fiscales, et de leur
            vérification auprès des organismes concernés ;
          </li>
          <li>
            les factures et documents que vous générez sont établis sous votre
            responsabilité, notamment quant à leurs mentions obligatoires et à
            leur conservation légale.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="contenus" title="5. Vos contenus">
        <p>
          Vous restez <Strong>seul propriétaire</Strong>{" "}des contenus que vous
          déposez ou saisissez dans le Service : fichiers audio, pochettes,
          contrats, relevés, factures, métadonnées, textes et données (les
          « Contenus »).
        </p>
        <p>
          Pour que le Service fonctionne, vous accordez à l&apos;Éditeur, pour la
          durée d&apos;existence de votre compte et pour le monde entier, une
          licence gratuite et non exclusive limitée à :
        </p>
        <LegalList>
          <li>héberger, sauvegarder et reproduire techniquement les Contenus ;</li>
          <li>
            les afficher, les convertir ou les traiter pour vous les restituer
            (lecture audio, forme d&apos;onde, génération de PDF) ;
          </li>
          <li>
            les rendre accessibles aux seules personnes que vous désignez, par
            exemple via un lien d&apos;écoute.
          </li>
        </LegalList>
        <p>
          L&apos;Éditeur n&apos;utilise pas vos Contenus à d&apos;autres fins : ni
          diffusion publique, ni revente, ni entraînement de modèles
          d&apos;intelligence artificielle.
        </p>
        <p>
          Vous garantissez disposer des droits nécessaires sur les Contenus que
          vous déposez (droits d&apos;auteur, droits voisins, droit à
          l&apos;image, accord des coauteurs le cas échéant) et que ces Contenus
          ne sont pas illicites.
        </p>
      </LegalSection>

      <LegalSection title="6. Liens d'écoute">
        <p>
          Le Service permet de générer des liens d&apos;écoute privés vers vos
          titres. Vous choisissez à qui vous les envoyez et répondez de cette
          diffusion. Vous pouvez révoquer un lien à tout moment, mais
          l&apos;Éditeur ne peut empêcher un destinataire de conserver ou de
          transmettre ce qu&apos;il a pu télécharger lorsque vous l&apos;avez
          autorisé.
        </p>
        <p>
          Les ouvertures et écoutes de ces liens sont mesurées pour vous être
          présentées. Les personnes qui les consultent en sont informées sur la
          page d&apos;écoute.
        </p>
      </LegalSection>

      <LegalSection title="7. Données de tiers que vous saisissez">
        <p>
          Lorsque vous enregistrez des données concernant d&apos;autres personnes
          (contacts professionnels, coauteurs, clients, destinataires de liens
          d&apos;écoute), vous agissez en tant que responsable de traitement au
          sens du RGPD pour ces données, et l&apos;Éditeur en tant que
          sous-traitant. Les conditions de ce traitement figurent en{" "}
          <LegalLink href="#annexe">annexe</LegalLink>. Il vous revient de
          disposer d&apos;une base légale pour ces données et d&apos;informer les
          personnes concernées lorsque la loi l&apos;exige.
        </p>
      </LegalSection>

      <LegalSection title="8. Usages interdits">
        <p>Il est interdit :</p>
        <LegalList>
          <li>
            de déposer ou diffuser des contenus illicites, contrefaisants,
            diffamatoires ou portant atteinte à la vie privée d&apos;autrui ;
          </li>
          <li>
            d&apos;utiliser le Service pour envoyer des communications non
            sollicitées ;
          </li>
          <li>
            de tenter d&apos;accéder aux données d&apos;autres utilisateurs, de
            contourner les limitations techniques, de surcharger
            l&apos;infrastructure ou d&apos;extraire le Service de manière
            automatisée ;
          </li>
          <li>de revendre ou mettre le Service à disposition de tiers.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="signalement" title="9. Signaler un contenu illicite">
        <p>
          Toute personne peut signaler un contenu qu&apos;elle estime illicite en
          écrivant à <ContactEmail />, en indiquant son identité, la localisation
          précise du contenu (par exemple l&apos;adresse du lien d&apos;écoute),
          et les raisons pour lesquelles elle le considère illicite.
          L&apos;Éditeur accuse réception, examine le signalement avec diligence
          et informe l&apos;auteur du signalement et l&apos;utilisateur concerné
          de sa décision et de ses motifs.
        </p>
      </LegalSection>

      <LegalSection title="10. Disponibilité et sauvegardes">
        <p>
          L&apos;Éditeur s&apos;efforce de rendre le Service accessible en
          permanence, sans garantie de disponibilité continue, notamment pendant
          l&apos;alpha. Des interruptions peuvent intervenir pour maintenance,
          mise à jour ou en cas d&apos;incident.
        </p>
        <p>
          Des sauvegardes régulières sont réalisées. Le Service ne remplace pas
          pour autant la conservation, par vos soins, d&apos;une copie de vos
          fichiers et documents importants (masters, contrats, factures).
        </p>
      </LegalSection>

      <LegalSection title="11. Responsabilité">
        <p>
          L&apos;Éditeur est responsable des manquements à ses obligations qui
          lui sont imputables. Il n&apos;est pas responsable des dommages
          résultant d&apos;une utilisation du Service non conforme aux CGU, des
          données inexactes que vous avez saisies, des décisions que vous prenez
          sur la foi des indications du Service (article 4), d&apos;un cas de
          force majeure ou du fait d&apos;un tiers.
        </p>
        <p>
          Lorsque vous utilisez le Service à des fins professionnelles, et
          compte tenu de sa gratuité, la responsabilité de l&apos;Éditeur est
          limitée aux dommages directs et prévisibles, sauf faute lourde ou
          dolosive.
        </p>
        <p>
          Aucune stipulation des CGU ne limite les droits que vous tenez de la
          loi si vous agissez en qualité de consommateur.
        </p>
      </LegalSection>

      <LegalSection title="12. Propriété du Service et retours">
        <p>
          Le Service, sa marque, son interface et son code restent la propriété
          de l&apos;Éditeur. Les CGU ne vous confèrent qu&apos;un droit
          d&apos;usage personnel, pour la durée de votre compte.
        </p>
        <p>
          Les suggestions et retours que vous adressez sur le Service peuvent
          être librement utilisés par l&apos;Éditeur pour l&apos;améliorer, sans
          contrepartie.
        </p>
      </LegalSection>

      <LegalSection id="resiliation" title="13. Durée, suppression du compte et suspension">
        <p>
          Les CGU s&apos;appliquent pour une durée indéterminée, tant que votre
          compte existe.
        </p>
        <p>
          Vous pouvez demander la suppression de votre compte à tout moment, sans
          motif, en écrivant à <ContactEmail />{" "}depuis l&apos;adresse du compte.
          La suppression est effectuée sous 30 jours et entraîne
          l&apos;effacement de vos Contenus, dans les conditions de la politique
          de confidentialité. Pensez à récupérer auparavant vos documents,
          notamment les factures que la loi vous impose de conserver ; une copie
          de vos données vous est fournie sur simple demande.
        </p>
        <p>
          L&apos;Éditeur peut suspendre ou supprimer un compte en cas de
          manquement grave aux CGU, après vous en avoir informé par email et
          vous avoir laissé la possibilité de répondre, sauf urgence ou
          obligation légale. Il peut également mettre fin au Service en vous
          prévenant au moins 30 jours à l&apos;avance, délai pendant lequel vous
          pouvez exporter vos données.
        </p>
      </LegalSection>

      <LegalSection title="14. Modification des CGU">
        <p>
          L&apos;Éditeur peut faire évoluer les CGU. Toute modification
          substantielle vous est notifiée par email au moins 30 jours avant son
          entrée en vigueur. Si vous la refusez, vous pouvez supprimer votre
          compte avant cette date ; à défaut, les nouvelles CGU
          s&apos;appliquent.
        </p>
      </LegalSection>

      <LegalSection title="15. Droit applicable et litiges">
        <p>
          Les CGU sont soumises au droit français. En cas de difficulté,
          écrivez d&apos;abord à <ContactEmail />{" "}: la plupart des questions se
          règlent ainsi.
        </p>
        <p>
          Si vous agissez en qualité de consommateur et qu&apos;aucune solution
          n&apos;est trouvée, vous pouvez recourir gratuitement au médiateur de
          la consommation : {LEGAL_MEDIATOR.name}, {LEGAL_MEDIATOR.website}.
        </p>
        <p>
          À défaut d&apos;accord amiable, le litige est porté devant les
          juridictions compétentes selon les règles de droit commun. Entre
          professionnels, compétence est attribuée aux tribunaux du ressort du
          siège de l&apos;Éditeur.
        </p>
      </LegalSection>

      <LegalSection
        id="annexe"
        title="Annexe : traitement des données de tiers pour votre compte"
      >
        <p>
          Cette annexe constitue le contrat de sous-traitance prévu par
          l&apos;article 28 du RGPD, pour les données de tiers que vous
          saisissez dans le Service (article 7).
        </p>
        <p>
          <Strong>Objet et durée.</Strong>{" "}Hébergement et traitement de ces
          données pour vous fournir le Service, pendant la durée de votre compte.
        </p>
        <p>
          <Strong>Données et personnes concernées.</Strong>{" "}Identité,
          coordonnées professionnelles, rôle, informations de facturation et de
          répartition de droits, historique d&apos;échanges et d&apos;écoute, de
          vos contacts, coauteurs, clients et destinataires. Aucune donnée
          sensible au sens de l&apos;article 9 du RGPD ne doit être saisie.
        </p>
        <p>
          <Strong>Engagements de l&apos;Éditeur.</Strong>{" "}L&apos;Éditeur :
        </p>
        <LegalList>
          <li>
            ne traite ces données que pour fournir le Service, conformément à vos
            instructions, qui résultent des CGU et de votre utilisation des
            fonctionnalités ;
          </li>
          <li>
            veille à ce que les personnes autorisées à y accéder soient tenues à
            la confidentialité ;
          </li>
          <li>
            met en œuvre les mesures de sécurité décrites dans la politique de
            confidentialité (article 32 du RGPD) ;
          </li>
          <li>
            recourt aux sous-traitants ultérieurs listés dans la politique de
            confidentialité, que vous autorisez de manière générale ; tout
            changement vous est notifié au moins 30 jours à l&apos;avance et vous
            pouvez vous y opposer en supprimant votre compte ;
          </li>
          <li>
            vous aide, dans la mesure du possible, à répondre aux demandes
            d&apos;exercice de droits des personnes et à respecter vos
            obligations de sécurité et de notification ;
          </li>
          <li>
            vous notifie toute violation de données les concernant dans les
            meilleurs délais, et au plus tard 48 heures après en avoir pris
            connaissance ;
          </li>
          <li>
            supprime ces données à la suppression de votre compte, après vous
            avoir permis d&apos;en obtenir une copie ;
          </li>
          <li>
            met à votre disposition les informations nécessaires pour démontrer
            le respect de ces obligations.
          </li>
        </LegalList>
      </LegalSection>
    </LegalPage>
  );
}

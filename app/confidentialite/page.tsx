import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { cn, focusRing } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment SIDEKICK collecte, utilise et protège tes données personnelles, et comment exercer tes droits RGPD.",
  robots: { index: true, follow: true },
};

/**
 * Brouillon de travail : la structure et les engagements par défaut sont posés,
 * les mentions légales précises (identité du responsable, coordonnées, SIRET,
 * durées exactes) restent à compléter — repérées par « [à compléter] ».
 */
const LAST_UPDATED = "à compléter";

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#f5f5f5]/70">
        {children}
      </div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#101010] text-[#f5f5f5]">
      <header className="sticky top-0 z-50 border-b border-[rgba(245,245,245,0.12)] bg-[#101010]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="SIDEKICK — accueil"
            className={cn("shrink-0 rounded-sm", focusRing)}
          >
            <SidekickLogo className="h-10 w-auto" priority />
          </Link>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-sm text-sm text-[#f5f5f5]/60 transition-colors hover:text-[#F0FF00]",
              focusRing
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Légal
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">
            POLITIQUE DE CONFIDENTIALITÉ
          </h1>
          <p className="text-sm text-[#f5f5f5]/50">
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>

        <div className="mt-6 rounded-sm border border-[rgba(240,255,0,0.3)] bg-[rgba(240,255,0,0.05)] p-4 text-xs leading-relaxed text-[#f5f5f5]/70">
          Document en cours de finalisation. Les engagements ci-dessous
          s&apos;appliquent dès aujourd&apos;hui ; les mentions marquées
          «&nbsp;[à compléter]&nbsp;» seront précisées avant la sortie de l&apos;alpha.
        </div>

        <div className="mt-12 space-y-10">
          <Section title="1. Qui est responsable de tes données">
            <p>
              SIDEKICK est édité par [à compléter : nom / raison sociale],
              [à compléter : statut juridique], [à compléter : adresse],
              [à compléter : SIRET].
            </p>
            <p>
              Pour toute question relative à tes données personnelles ou pour
              exercer tes droits :{" "}
              <a
                href="mailto:contact@sidekickartists.com"
                className={cn(
                  "rounded-sm text-[#F0FF00] underline underline-offset-4",
                  focusRing
                )}
              >
                contact@sidekickartists.com
              </a>
              .
            </p>
          </Section>

          <Section title="2. Les données que nous collectons">
            <p>
              <span className="text-[#f5f5f5]/90">Compte.</span> Nom, prénom,
              adresse email, mot de passe (chiffré). Si tu te connectes via
              Google, les informations de profil que Google nous transmet
              (email, nom).
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Contenu que tu saisis.</span>{" "}
              Tout ce que tu crées dans les modules : titres et métadonnées,
              œuvres, dates de concert, contacts, factures, statuts
              administratifs, campagnes, fichiers importés, etc. Ces données
              t&apos;appartiennent.
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Données techniques.</span>{" "}
              Journaux de connexion, type d&apos;appareil et de navigateur,
              pages consultées et interactions, à des fins de sécurité et
              d&apos;amélioration du produit.
            </p>
          </Section>

          <Section title="3. Pourquoi nous les utilisons, et sur quelle base">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Fournir le service et ton compte —{" "}
                <span className="text-[#f5f5f5]/90">exécution du contrat</span>.
              </li>
              <li>
                Sécuriser l&apos;accès et prévenir les abus —{" "}
                <span className="text-[#f5f5f5]/90">intérêt légitime</span>.
              </li>
              <li>
                Mesurer l&apos;usage et améliorer le produit (statistiques) —{" "}
                <span className="text-[#f5f5f5]/90">intérêt légitime</span>, avec
                des données limitées au strict nécessaire.
              </li>
              <li>
                T&apos;envoyer des emails liés au service (confirmation, sécurité,
                changements importants) —{" "}
                <span className="text-[#f5f5f5]/90">exécution du contrat</span>.
              </li>
              <li>
                Respecter nos obligations légales (comptables, fiscales) —{" "}
                <span className="text-[#f5f5f5]/90">obligation légale</span>.
              </li>
            </ul>
            <p>
              Nous ne vendons pas tes données et ne les utilisons pas à des fins
              publicitaires de tiers.
            </p>
          </Section>

          <Section title="4. Hébergement et sous-traitants">
            <p>
              Tes données sont hébergées dans l&apos;Union européenne
              [à compléter : région exacte, ex. Supabase — Francfort].
            </p>
            <p>
              Nous nous appuyons sur des prestataires qui agissent pour notre
              compte, encadrés par contrat :
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-[#f5f5f5]/90">Supabase</span> —
                base de données, authentification et stockage de fichiers
                (hébergement UE).
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">Vercel</span> —
                hébergement de l&apos;application et diffusion des pages.
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">PostHog</span> —
                mesure d&apos;audience et statistiques d&apos;usage
                [à compléter : région d&apos;instance].
              </li>
              <li>
                <span className="text-[#f5f5f5]/90">Brevo</span> —
                envoi des emails transactionnels.
              </li>
            </ul>
            <p>
              Lorsqu&apos;un transfert hors UE est nécessaire, il est encadré par
              les clauses contractuelles types de la Commission européenne.
            </p>
          </Section>

          <Section title="5. Combien de temps nous les conservons">
            <p>
              Tes données de compte et de contenu sont conservées tant que ton
              compte est actif. À la suppression du compte, elles sont effacées
              sous [à compléter : délai, ex. 30 jours], sauf obligation légale de
              conservation (par exemple les pièces comptables :
              [à compléter : durée légale]).
            </p>
            <p>
              Les données de mesure d&apos;audience sont conservées
              [à compléter : durée].
            </p>
          </Section>

          <Section title="6. Tes droits">
            <p>
              Conformément au RGPD, tu disposes des droits d&apos;accès, de
              rectification, d&apos;effacement, de limitation, d&apos;opposition
              et de portabilité de tes données.
            </p>
            <p>
              <span className="text-[#f5f5f5]/90">Export.</span> Tu peux demander
              à tout moment une copie de l&apos;ensemble de tes données dans un
              format lisible et réutilisable. Écris-nous, nous te la fournissons
              sous 30 jours au plus.
            </p>
            <p>
              Pour exercer un droit, écris à{" "}
              <a
                href="mailto:contact@sidekickartists.com"
                className={cn(
                  "rounded-sm text-[#F0FF00] underline underline-offset-4",
                  focusRing
                )}
              >
                contact@sidekickartists.com
              </a>
              . Tu peux aussi introduire une réclamation auprès de la CNIL
              (www.cnil.fr).
            </p>
          </Section>

          <Section id="cookies" title="7. Cookies et mesure d'audience">
            <p>
              Nous utilisons un cookie de session, indispensable, pour te
              garder connecté. Il ne demande pas ton accord.
            </p>
            <p>
              La mesure d&apos;audience (PostHog) est soumise à ton accord, via
              le bandeau affiché à ta première visite. Tant que tu n&apos;as pas
              accepté, aucun cookie de mesure n&apos;est déposé et aucune
              donnée d&apos;usage n&apos;est envoyée. Si tu acceptes, nous
              collectons les pages vues, les clics et des enregistrements de
              session dans lesquels le contenu des champs de saisie est
              systématiquement masqué.
            </p>
            <p>
              Tu peux retirer ou donner ton accord à tout moment :{" "}
              <CookieSettingsButton className="text-[#F0FF00] underline underline-offset-2" />
              .
            </p>
          </Section>

          <Section title="8. Modifications">
            <p>
              Cette politique peut évoluer. En cas de changement significatif,
              nous t&apos;en informons par email ou via l&apos;application avant
              son entrée en vigueur.
            </p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

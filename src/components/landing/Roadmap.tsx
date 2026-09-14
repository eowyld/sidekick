import {
  FileSignature,
  Link2,
  Radio,
  ScanBarcode,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, hoverZoom } from "@/lib/utils";

type Upcoming = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/**
 * Roadmap volontairement courte : les six chantiers qui changent le rapport de
 * l'artiste à son argent et à sa diffusion. Aucune date n'est promise — une
 * roadmap datée devient une dette dès qu'elle glisse.
 */
const UPCOMING: Upcoming[] = [
  {
    icon: Radio,
    title: "Distribution sur les plateformes",
    body: "Envoyer tes sorties en streaming depuis SIDEKICK, sans repasser par un distributeur tiers.",
  },
  {
    icon: Wallet,
    title: "Récupération de tes droits d'auteur",
    body: "SIDEKICK va chercher ce qui te revient au lieu de te laisser courir après.",
  },
  {
    icon: TrendingUp,
    title: "Suivi automatique de tes œuvres",
    body: "Statistiques et revenus cumulés, par œuvre et par enregistrement, sans import manuel.",
  },
  {
    icon: ScanBarcode,
    title: "Génération de codes ISRC et UPC",
    body: "Tes codes créés directement ici, au lieu d'être demandés ailleurs et recopiés à la main.",
  },
  {
    icon: Link2,
    title: "Smartlinks",
    body: "Un lien unique vers toutes tes plateformes d'écoute et de téléchargement.",
  },
  {
    icon: FileSignature,
    title: "Gestion des contrats",
    body: "Modèles, envoi et signature en ligne, rattachés à tes dates et à tes projets.",
  },
];

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="scroll-mt-20 md:scroll-mt-24 border-b border-[rgba(245,245,245,0.12)] py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            En développement
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            LA SUITE EST <span className="text-[#F0FF00]">ÉCRITE.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Ces fonctionnalités arriveront au lancement officiel de
            l&apos;application.
          </p>
        </div>

        {/*
          Cartes bordées distinctes, avec de vrais espaces entre elles — pas le
          damier collé « gap-px » de la grille de modules, ni les listes à plat
          de Pain Points / ProductProof. Le badge « En développement » par carte
          a sauté : il répétait l'eyebrow de la section.
        */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UPCOMING.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cn(
                  "rounded-sm border border-[rgba(245,245,245,0.12)] p-5",
                  // Agrandissement au survol ; `hover:z-10` pour passer au-dessus
                  // des cartes voisines pendant le zoom.
                  "relative hover:z-10 hover:border-[#F0FF00]/25",
                  hoverZoom
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[#F0FF00]/25 bg-[#F0FF00]/5">
                  <Icon className="h-4 w-4 text-[#F0FF00]" />
                </span>
                {/* h3 sous le h2 de section : balisage, pas de style — Preflight
                    aligne le heading sur les classes ci-dessous. */}
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#f5f5f5]/55">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

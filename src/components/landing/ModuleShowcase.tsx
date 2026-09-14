import type { StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import { ProductShot } from "./ProductShot";
import { SectionGlow } from "./SectionGlow";
import editionShot from "../../../public/images/landing/edition.png";
import editionMobile from "../../../public/images/landing/edition-mobile.png";
import liveShot from "../../../public/images/landing/live.png";
import liveMobile from "../../../public/images/landing/live-mobile.png";
import revenusShot from "../../../public/images/landing/revenus.png";
import revenusMobile from "../../../public/images/landing/revenus-mobile.png";

type Feature = {
  label: string;
  /** Une ligne d'explication concrète — c'est elle qui porte le fond. */
  detail: string;
  comingSoon?: true;
};

type Showcase = {
  id: string;
  eyebrow: string;
  /** Le mot ou segment passé en accent. Un seul par bloc. */
  title: string;
  accent: string;
  features: Feature[];
  image: StaticImageData;
  /** Recadrage de détail affiché sous 640 px, cf. ProductShot. */
  mobileImage: StaticImageData;
  alt: string;
};

const SHOWCASES: Showcase[] = [
  {
    id: "live",
    eyebrow: "Live",
    title: "TA TOURNÉE TIENT",
    accent: "DANS UN ÉCRAN.",
    features: [
      {
        label: "Suivi des dates",
        detail:
          "Répétitions et représentations, triées par statut, de la première idée à la date jouée.",
      },
      {
        label: "Prospection",
        detail:
          "Un vrai accompagnement en amont : contacts, relances et suivi jusqu'à ce qu'un projet se concrétise.",
      },
      {
        label: "Suivi admin",
        detail: "Transport, logement, contrat, rémunération : rattachés à chaque date.",
      },
      {
        label: "Itinéraire sur carte",
        detail:
          "Les dates se placent seules dans l'ordre, la tournée se dessine sans rien saisir.",
      },
      {
        label: "Inventaire du matériel",
        detail:
          "Ton parc et une liste dédiée pour chacun de tes dispositifs de tournée.",
      },
    ],
    image: liveShot,
    mobileImage: liveMobile,
    alt: "Module Live : répartition des dates par statut, prochains événements et itinéraire de tournée sur carte.",
  },
  {
    id: "incomes",
    eyebrow: "Revenus",
    title: "CE QUE TU GAGNES",
    accent: "VRAIMENT.",
    features: [
      {
        label: "Encaissé & à venir",
        detail:
          "Droits d'auteur, phono, facturation et intermittence sur une seule courbe, comparée à l'an dernier.",
      },
      {
        label: "Factures & relances",
        detail:
          "Ce qui reste à encaisser et les relances à envoyer, sans rouvrir de tableur.",
      },
      {
        label: "Intermittence & cachets",
        detail:
          "Missions, cachets et heures qui comptent pour tes droits, suivis à part.",
      },
      {
        label: "Import des relevés",
        detail:
          "DistroKid, TuneCore, CD Baby, SoundCloud : les relevés se rangent tout seuls.",
        comingSoon: true,
      },
    ],
    image: revenusShot,
    mobileImage: revenusMobile,
    alt: "Module Revenus : encaissé sur l'année, factures en attente et évolution mensuelle par source de revenu.",
  },
  {
    id: "edition",
    eyebrow: "Édition",
    title: "TES DROITS, AU",
    accent: "POURCENT PRÈS.",
    features: [
      {
        label: "Ayants droit & rôles",
        detail:
          "Auteurs, compositeurs, arrangeurs, éditeur : la répartition de chaque œuvre, au pourcent près.",
      },
      {
        label: "Répartition DEP / DRM",
        detail:
          "Droits d'exécution et de reproduction visualisés, prêts pour la déclaration.",
      },
      {
        label: "Territoires & exploitations",
        detail: "Où et comment chaque œuvre peut être exploitée.",
      },
      {
        label: "Pistes de synchronisation",
        detail: "Le suivi des opportunités de synchro, de la piste au contrat signé.",
        comingSoon: true,
      },
    ],
    image: editionShot,
    mobileImage: editionMobile,
    alt: "Module Édition : ayants droit d'une œuvre et répartition graphique des droits DEP et DRM.",
  },
];

export function ModuleShowcase() {
  return (
    <section className="relative overflow-hidden border-b border-[rgba(245,245,245,0.12)] py-12">
      <SectionGlow align="left" />
      {/*
        Pas d'en-tête ici : la section montre l'appli, elle n'a pas à
        réintroduire la promesse déjà portée par les sections du dessus.
        Chaque bloc porte son propre titre.

        Pas de paragraphe d'accroche non plus : le titre pose la promesse, la
        liste de features en dit le détail. Chaque feature = un intitulé + une
        ligne concrète, présentée en liste bordée (et non en checklist, motif
        déjà utilisé par la grille de modules au-dessus).
      */}
      <div className="relative z-10 mx-auto max-w-6xl space-y-16 px-6">
        {SHOWCASES.map((s, i) => (
          <div
            key={s.id}
            id={`showcase-${s.id}`}
            className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-12"
          >
            <div
              className={cn(
                "space-y-6",
                // Alternance : une section sur deux inverse texte et visuel.
                i % 2 === 1 && "lg:order-2"
              )}
            >
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                  {s.eyebrow}
                </p>
                <h3 className="font-display text-2xl leading-tight sm:text-3xl">
                  {s.title}{" "}
                  <span className="text-[#F0FF00]">{s.accent}</span>
                </h3>
              </div>

              <ul className="space-y-4">
                {s.features.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      "border-l-2 pl-4",
                      f.comingSoon
                        ? "border-[rgba(245,245,245,0.12)]"
                        : "border-[#F0FF00]/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          f.comingSoon ? "text-[#f5f5f5]/60" : "text-[#f5f5f5]"
                        )}
                      >
                        {f.label}
                      </span>
                      {f.comingSoon && (
                        <span className="whitespace-nowrap rounded-full border border-[rgba(240,255,0,0.3)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#F0FF00]/70">
                          Bientôt
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#f5f5f5]/55">
                      {f.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <ProductShot
              src={s.image}
              mobileSrc={s.mobileImage}
              alt={s.alt}
              className={cn(i % 2 === 1 && "lg:order-1")}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

import {
  Album,
  Building2,
  CalendarDays,
  FileSignature,
  FolderKanban,
  ListChecks,
  Megaphone,
  Mic2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type LandingModule = {
  /** Identifiant stable, sert d'ancre et de clé de panneau. */
  id: string;
  name: string;
  /**
   * Groupe affiché dans le méga-menu de la nav. Reprend la segmentation de la
   * sidebar de l'app : Organisation, Artistique, Business.
   */
  group: "Organisation" | "Artistique" | "Business";
  icon: LucideIcon;
  /** Une ligne, affichée sous le nom dans le panneau ouvert. */
  kicker: string;
  /**
   * Deux phrases max, à hauteur d'artiste : ce que le module change dans ta
   * façon de travailler. Pas d'énumération de fonctionnalités ni de termes
   * techniques — ils sont juste en dessous, dans `features`.
   */
  description: string;
  /**
   * Le concret, en langage métier : ce que le module sait faire, nommé
   * précisément. Une chaîne pour une fonctionnalité livrée, un objet pour
   * celle qui ne l'est pas encore — la grille lui accole alors l'étiquette
   * « Bientôt ».
   */
  features: (string | { label: string; comingSoon: true })[];
  /** Module annoncé mais pas encore livré : affiche l'étiquette « Bientôt ». */
  comingSoon?: boolean;
};

/**
 * L'ordre de ce tableau pilote la grille, le footer et l'ordre interne du
 * méga-menu. Il suit l'ordre de la sidebar de l'app (le tableau de bord n'y
 * figure pas : il est déjà présenté par la capture du hero).
 */
export const LANDING_MODULES: LandingModule[] = [
  {
    id: "calendar",
    name: "Calendrier",
    group: "Organisation",
    icon: CalendarDays,
    kicker: "Vue transversale",
    description:
      "Tu sais ce qui t'attend. Ce que tu saisis dans les autres modules atterrit ici, et ton agenda habituel reste à jour.",
    features: [
      "Concerts, répétitions, sessions studio, échéances et deadlines agrégés",
      "Vue mensuelle et hebdomadaire",
      "Flux iCal : abonne Google Agenda ou Apple Calendrier",
    ],
  },
  {
    id: "tasks",
    name: "Tâches",
    group: "Organisation",
    icon: ListChecks,
    kicker: "À faire, par secteur",
    description:
      "Tu avances sur ce qui compte au lieu d'essayer de te rappeler ce qu'il restait à faire. Rien ne passe à la trappe parce que c'était noté ailleurs.",
    features: [
      "Tâches par secteur, avec sous-étapes",
      "Dates limites, avec alerte quand l'échéance approche ou est dépassée",
      "Vue du jour et backlog",
      {
        label: "Suggestions de tâches à partir de tes autres modules",
        comingSoon: true,
      },
    ],
  },
  {
    id: "contacts",
    name: "Contacts",
    group: "Organisation",
    icon: Users,
    kicker: "Carnet professionnel",
    description:
      "Ton réseau devient un vrai carnet d'adresses, pas un fil de messages où tu fouilles. Tu retrouves la bonne personne au moment où tu en as besoin.",
    features: [
      "Fiches par métier et par structure",
      "Recherche et filtre par métier",
    ],
  },
  {
    id: "projects",
    name: "Projets",
    group: "Organisation",
    icon: FolderKanban,
    kicker: "Le point de départ",
    description:
      "Tu arrêtes de mener tes sorties à l'instinct. Chaque album, single ou tournée devient un projet que tu ouvres pour savoir où tu en es, ce qu'il reste à faire et ce que ça te coûte, avec une vue d'ensemble de chaque module.",
    features: [
      "Un projet par album, single, EP ou tournée",
      "Onglets création, marketing, admin et budget",
      "Budget prévisionnel vs dépenses réelles, revenus et balance en direct",
      "Œuvres, titres, dates et tâches rattachés au projet",
    ],
  },
  {
    id: "live",
    name: "Live",
    group: "Artistique",
    icon: Mic2,
    kicker: "Scène & tournée",
    description:
      "Tu sais où en est chaque date : celles que tu relances, celles qui sont signées, celles qui approchent. Et ce que chacune te rapporte une fois les frais déduits.",
    features: [
      "Dates par statut : prospection, confirmée, signée",
      "Prospection de lieux et suivi des relances",
      "Itinéraire de tournée sur carte",
      "Répétitions et plannings",
      "Inventaire matériel et listes de départ",
    ],
  },
  {
    id: "phono",
    name: "Phono",
    group: "Artistique",
    icon: Album,
    kicker: "Catalogue prêt à distribuer",
    description:
      "Ton catalogue devient présentable : plus un dossier de fichiers nommés à la main, mais quelque chose que tu peux envoyer tel quel à un distributeur, un label ou un ingé master.",
    features: [
      "Métadonnées écrites dans le fichier audio : ISRC, crédits, pochette",
      "Crédits par rôle : compositeur, beatmaker, ingé mixage, mastering",
      "Export d'un titre ou d'un album entier en ZIP",
      "Statut de production : en cours, mixé, mastérisé, publié",
      "Albums, EP, mixes et sessions studio rattachés aux titres",
    ],
  },
  {
    id: "edition",
    name: "Édition",
    group: "Artistique",
    icon: FileSignature,
    kicker: "Œuvres & répartition des droits",
    description:
      "Tes droits ne reposent plus sur ta mémoire ni sur un tableur. Qui a fait quoi, qui touche quoi : c'est écrit, à jour, et prêt le jour où il faut déclarer.",
    features: [
      "Ayants droit et rôles par œuvre : auteur, compositeur, arrangeur, éditeur",
      "Répartition DEP et DRM en pourcentages",
      "Territoires et types d'exploitation",
      { label: "Suivi des opportunités de synchronisation", comingSoon: true },
    ],
  },
  {
    id: "incomes",
    name: "Revenus",
    group: "Business",
    icon: Wallet,
    kicker: "Facturation & royalties",
    description:
      "Tu sais enfin ce que ta musique te rapporte, et d'où ça vient. De quoi budgéter une sortie, négocier un cachet et arrêter de découvrir ton année chez le comptable.",
    features: [
      "Droits d'auteur, droits phono, facturation et intermittence dans un seul graphe",
      "Encaissé, à venir, moyenne mensuelle et source principale",
      "Factures : en attente, payées, relances",
      "Évolution mensuelle comparée à l'an dernier",
      {
        label: "Import des relevés DistroKid, TuneCore, CD Baby, SoundCloud",
        comingSoon: true,
      },
    ],
  },
  {
    id: "admin",
    name: "Admin",
    group: "Business",
    icon: Building2,
    kicker: "Statuts, démarches & documents",
    description:
      "L'administratif cesse d'être ce que tu repousses parce que c'est éparpillé. Tu vois où tu en es et ce qui tombe bientôt, sans ouvrir six espaces en ligne.",
    features: [
      "Statuts et structures juridiques",
      "Démarches suivies par échéance : URSSAF, France Travail, TVA",
      "Espace documents et stockage de fichiers",
      { label: "Suivi comptable", comingSoon: true },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    group: "Business",
    icon: Megaphone,
    kicker: "Audience & presskit",
    description:
      "Tu ne laisses plus une sortie passer inaperçue faute de temps. Annoncer un titre ou démarcher un programmateur redevient une routine, pas un chantier de trois soirées.",
    features: [
      "Liste de diffusion segmentée : fans, pros, presse",
      "Campagnes email rattachées à un projet",
      "Presskit en ligne, partagé par lien",
      "Plan de com' d'une sortie dans le calendrier",
    ],
    comingSoon: true,
  },
];

export const MODULE_GROUPS = [
  "Organisation",
  "Artistique",
  "Business",
] as const;

/**
 * Store persistant Sidekick (localStorage).
 * Une seule clé "sidekick-data" pour tout effacer facilement.
 *
 * Convention : toutes les infos de tous les modules vivent ici.
 * - Ajouter un module : étendre SidekickData + DEFAULT_SIDEKICK_DATA.
 * - Lire/écrire : useSidekickData() → data.<module>.<slice>, setData(prev => ({ ...prev, <module>: { ... } })).
 * - Reset : /reset-data ou "npm run reset-data".
 */

export const SIDEKICK_STORAGE_KEY_PREFIX = "sidekick-data";

/** Clé de stockage par utilisateur. Chaque user a ses propres données. */
export function getStorageKey(userId: string | null): string {
  return userId ? `${SIDEKICK_STORAGE_KEY_PREFIX}-${userId}` : `${SIDEKICK_STORAGE_KEY_PREFIX}-anon`;
}

// --- Tasks ---
export interface Todo {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done"; // remplace done: boolean
  todayFocus: boolean;
  description?: string;
  deadline?: string;
  sector?:
    | "Live"
    | "Phono"
    | "Admin"
    | "Marketing"
    | "Edition"
    | "Revenus"
    | "Autre";
  createdAt?: string;
  subtasks?: { id: string; title: string; done: boolean }[];
}

// --- Admin ---
export type AdminStatusType =
  | "auto_entrepreneur"
  | "association_1901"
  | "intermittent"
  | "artiste_auteur"
  | "sas_sasu"
  | "sarl_eurl"
  | "salarie"
  | "autre";

export interface AdminStatus {
  id: string;
  nom: string;
  type: AdminStatusType;
  actif: boolean;
  dateDebut?: string;
  dateFin?: string;
  notes?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AdminStructure {
  id: string;
  name: string;
  [key: string]: unknown;
}
export interface AdminProcedure {
  id: string;
  label: string;
  [key: string]: unknown;
}
export interface AdminDocument {
  id: string;
  title: string;
  [key: string]: unknown;
}

/** Dossier utilisateur (les dossiers par module sont prédéfinis, non stockés). */
export interface AdminDocumentFolder {
  id: string;
  name: string;
}
export interface AdminIntermittenceMission {
  id: string;
  label: string;
  [key: string]: unknown;
}

// --- Calendar ---
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  [key: string]: unknown;
}

// --- Contacts ---
export interface Contact {
  id: string;
  name: string;
  [key: string]: unknown;
}
export interface ProspectionItem {
  id: string;
  label: string;
  [key: string]: unknown;
}

// --- Dashboard ---
export interface Profile {
  displayName?: string;
  [key: string]: unknown;
}

// --- Edition ---

export type PersonRole = "author" | "composer" | "arranger" | "adapter";

/** Une personne impliquée dans l'œuvre (peut avoir plusieurs rôles) */
export interface Person {
  id: string;
  firstName: string;
  name: string;
  pseudonym: string;
  roles: PersonRole[];
}

/** Une part dans la distribution interne d'une catégorie */
export interface SplitEntry {
  personId: string; // référence à Person.id
  pct: number;      // 0–100, la somme de tous les SplitEntry d'une catégorie doit = 100
}

/** Clés SACEM — read-only, jamais modifiées par l'utilisateur */
export interface SacemRepartition {
  authors: number;    // % du total attribué aux auteurs
  composers: number;  // % du total attribué aux compositeurs
  publishers: number; // % du total attribué aux éditeurs
}

/** Un éditeur externe (société d'édition) — distinct des personnes physiques */
export interface EditionPublisher {
  id: string;
  name: string;
  coad: string; // Code international COAD
  pct: number;  // part dans la distribution éditeurs (sum = 100)
}

export interface Work {
  id: string;
  artistName: string;
  title: string;
  status: "in-progress" | "finalized" | "registered-sacem" | "accepted-sacem";

  persons: Person[];

  // Niveau 1 — clés SACEM (affichage uniquement)
  depRepartition: SacemRepartition;  // DEP par défaut : 33.33 / 33.33 / 33.33
  drmRepartition: SacemRepartition;  // DRM par défaut : 25 / 25 / 50

  // Niveau 2 — distribution interne par catégorie (sum = 100 chacune)
  splitsAuthors: SplitEntry[];
  splitsComposers: SplitEntry[];
  selfPublished: boolean;           // si true → l'artiste perçoit 100% de la part éditeurs
  externalPublishers: EditionPublisher[]; // éditeurs externes si selfPublished = false

  iswc: string;
  firstExploitationDate: string;
  genre: string;
  duration: string;
  files: { sheet?: string; lyrics?: string; audio?: string };
  exploitationTypes: ("streaming" | "live" | "sync" | "cover")[];
  firstBroadcaster: string;
  worldwideRights: boolean;
  territories: string[];
  notes: string;
  linkedTrackIds?: string[];
}

export interface Exploitant {
  id: string;
  company: string;
  project: "film" | "serie" | "pub" | "jeu-video" | "media" | "";
  date: string;
  status: "sent" | "discussing" | "accepted" | "refused" | "";
  notes: string;
}

export interface SyncData {
  workId: string;
  status: "not-ready" | "to-prepare" | "sync-ready" | "exploited";
  moods: string[];
  tempo: string;
  pitchShort: string;
  usageContext: string;
  themes: string[];
  privateLinks: string[];
  exploitants: Exploitant[];
}

// --- Incomes ---
export interface IncomeItem {
  id: string;
  label: string;
  amount?: number;
  [key: string]: unknown;
}

// --- Live ---
export interface TourDate {
  id: string;
  city: string;
  venue: string;
  date: string;
  status?: string;
  [key: string]: unknown;
}
export interface Rehearsal {
  id: string;
  label: string;
  date: string;
  location?: string;
  [key: string]: unknown;
}
export interface EquipmentItem {
  id: string;
  label: string;
  priority?: string;
  [key: string]: unknown;
}

// --- Marketing ---
export interface MailingItem {
  id: string;
  subject: string;
  [key: string]: unknown;
}
export interface MarketingEvent {
  id: string;
  title: string;
  date?: string;
  [key: string]: unknown;
}

// --- Projects ---
export interface ProjectMember {
  contactId: string | null;
  name: string;
  role: string;
}

export type ProjectStatus = "idea" | "in_progress" | "paused" | "done" | "archived";

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  cover: string;
  images: string[];
  sectors: ("phono" | "edition" | "live")[];
  members: ProjectMember[];
  linkedAlbums: string[];
  linkedTracks: string[];
  linkedSessions: string[];
  linkedWorks: string[];
  linkedTourDates: string[];
  linkedRehearsals: string[];
  createdAt: string;
  updatedAt: string;
  notes: string;
}

// --- Phono ---
export type PhonoRole =
  | "artiste_principal"
  | "artiste_secondaire"
  | "musicien_interprete"
  | "chanteur_interprete"
  | "directeur_musical"
  | "realisateur"
  | "compositeur"
  | "ingenieur_mixage"
  | "ingenieur_mastering"
  | "beatmaker"
  | "ingenieur_du_son";

export interface TrackVersion {
  id: string;
  label: string;
}

export interface Track {
  id: string;
  title: string;
  mainArtist: string;
  role: PhonoRole;
  guestArtists: string[];
  isrc: string;
  releaseDate: string;
  selfProduced: boolean;
  label?: string;
  editor?: string;
  versions: TrackVersion[];
  genre?: string;
  distribution?: string;
  notes: string;
  status?: ReleaseStatus;
  cover?: string;
  linkedWorkId?: string;
  [key: string]: unknown;
}

export type AlbumType = "album" | "ep" | "single";

export type ReleaseStatus =
  | "en_production"
  | "mixe"
  | "masterise"
  | "publie";

export interface AlbumGuest {
  id: string;
  name: string;
  role: PhonoRole;
}

export interface Album {
  id: string;
  title: string;
  type: AlbumType;
  status: ReleaseStatus;
  artist: string;
  releaseDate: string;
  upcEan: string;
  trackIds: string[];
  label?: string;
  genre?: string;
  editor?: string;
  distribution?: string;
  notes: string;
  cover?: string;
  guests?: AlbumGuest[];
  [key: string]: unknown;
}
export interface Session {
  id: string;
  title: string;
  date?: string;
  [key: string]: unknown;
}

export interface PodcastTracklistItem {
  id: string;
  artist: string;
  label: string;
  time: string;
}

export interface Podcast {
  id: string;
  title: string;
  artists: string;
  publishedOn: string;
  isVideo: boolean;
  isLive: boolean;
  status: ReleaseStatus;
  releaseDate: string;
  tracklist: PodcastTracklistItem[];
  cover?: string;
  [key: string]: unknown;
}

// --- Store global ---
export interface SidekickData {
  tasks: Todo[];
  admin: {
    statuses: AdminStatus[];
    structures: AdminStructure[];
    procedures: AdminProcedure[];
    documents: AdminDocument[];
    documentFolders: AdminDocumentFolder[];
    storageUsedBytes: number;
    intermittenceMissions: AdminIntermittenceMission[];
  };
  calendar: {
    events: CalendarEvent[];
  };
  contacts: {
    contacts: Contact[];
    prospection: ProspectionItem[];
  };
  dashboard: {
    profile: Profile;
  };
  edition: {
    works: Work[];
    sync: Record<string, SyncData>;
  };
  incomes: {
    royalties: IncomeItem[];
    invoices: IncomeItem[];
    copyright: IncomeItem[];
    neighboringRights: IncomeItem[];
  };
  live: {
    tourDates: TourDate[];
    rehearsals: Rehearsal[];
    equipment: EquipmentItem[];
  };
  marketing: {
    mailing: MailingItem[];
    events: MarketingEvent[];
    editorialPlatforms: string[];
    editorialContentTypes: string[];
  };
  phono: {
    albums: Album[];
    tracks: Track[];
    sessions: Session[];
    podcasts: Podcast[];
  };
  projects: {
    projects: Project[];
  };
  preferences: {
    enabledModules: {
      live: boolean;
      phono: boolean;
      admin: boolean;
      marketing: boolean;
      edition: boolean;
      revenus: boolean;
      projects: boolean;
    };
    aiTaskInstructions?: {
      general?: string;
      live?: string;
      phono?: string;
      admin?: string;
      marketing?: string;
      edition?: string;
      revenus?: string;
    };
  };
}

export const DEFAULT_SIDEKICK_DATA: SidekickData = {
  tasks: [],
  admin: {
    statuses: [],
    structures: [],
    procedures: [],
    documents: [],
    documentFolders: [],
    storageUsedBytes: 0,
    intermittenceMissions: []
  },
  calendar: {
    events: []
  },
  contacts: {
    contacts: [],
    prospection: []
  },
  dashboard: {
    profile: {}
  },
  edition: {
    works: [],
    sync: {}
  },
  incomes: {
    royalties: [],
    invoices: [],
    copyright: [],
    neighboringRights: []
  },
  live: {
    tourDates: [],
    rehearsals: [],
    equipment: []
  },
  marketing: {
    mailing: [],
    events: [],
    editorialPlatforms: [],
    editorialContentTypes: []
  },
  phono: {
    albums: [],
    tracks: [],
    sessions: [],
    podcasts: []
  },
  projects: {
    projects: [],
  },
  preferences: {
    enabledModules: {
      live: true,
      phono: true,
      admin: true,
      marketing: true,
      edition: true,
      revenus: true,
      projects: true,
    },
    aiTaskInstructions: {}
  }
};

/**
 * Fusionne des données partielles (ex. ancien localStorage) avec les défauts.
 */
export function mergeWithDefaults(
  partial: Partial<SidekickData> | null
): SidekickData {
  if (!partial || typeof partial !== "object") return DEFAULT_SIDEKICK_DATA;
  return {
    ...DEFAULT_SIDEKICK_DATA,
    ...partial,
    tasks: Array.isArray(partial.tasks)
      ? partial.tasks.map((t: Todo & { done?: boolean }) => ({
          ...t,
          // Migration: ancien format done: boolean → status
          status: t.status ?? (t.done ? "done" : "todo"),
          todayFocus: t.todayFocus ?? false,
        }))
      : DEFAULT_SIDEKICK_DATA.tasks,
    admin: {
      ...DEFAULT_SIDEKICK_DATA.admin,
      ...partial.admin,
      statuses: Array.isArray(partial.admin?.statuses) ? partial.admin.statuses : DEFAULT_SIDEKICK_DATA.admin.statuses,
      documents: Array.isArray(partial.admin?.documents) ? partial.admin.documents : DEFAULT_SIDEKICK_DATA.admin.documents,
      documentFolders: Array.isArray(partial.admin?.documentFolders) ? partial.admin.documentFolders : DEFAULT_SIDEKICK_DATA.admin.documentFolders,
      storageUsedBytes: typeof partial.admin?.storageUsedBytes === "number" ? partial.admin.storageUsedBytes : DEFAULT_SIDEKICK_DATA.admin.storageUsedBytes
    },
    calendar: { ...DEFAULT_SIDEKICK_DATA.calendar, ...partial.calendar },
    contacts: { ...DEFAULT_SIDEKICK_DATA.contacts, ...partial.contacts },
    dashboard: { ...DEFAULT_SIDEKICK_DATA.dashboard, ...partial.dashboard },
    edition: {
      ...DEFAULT_SIDEKICK_DATA.edition,
      ...partial.edition,
      works: Array.isArray(partial.edition?.works)
        ? partial.edition.works
        : DEFAULT_SIDEKICK_DATA.edition.works,
      sync:
        partial.edition?.sync &&
        typeof partial.edition.sync === "object" &&
        !Array.isArray(partial.edition.sync)
          ? (partial.edition.sync as Record<string, SyncData>)
          : DEFAULT_SIDEKICK_DATA.edition.sync,
    },
    incomes: { ...DEFAULT_SIDEKICK_DATA.incomes, ...partial.incomes },
    live: { ...DEFAULT_SIDEKICK_DATA.live, ...partial.live },
    marketing: { ...DEFAULT_SIDEKICK_DATA.marketing, ...partial.marketing },
    phono: { ...DEFAULT_SIDEKICK_DATA.phono, ...partial.phono },
    projects: {
      ...DEFAULT_SIDEKICK_DATA.projects,
      ...partial.projects,
      projects: Array.isArray(partial.projects?.projects)
        ? partial.projects.projects
        : DEFAULT_SIDEKICK_DATA.projects.projects,
    },
    preferences: {
      ...DEFAULT_SIDEKICK_DATA.preferences,
      ...partial.preferences,
      enabledModules: {
        ...DEFAULT_SIDEKICK_DATA.preferences.enabledModules,
        ...(partial.preferences?.enabledModules ?? {})
      }
    }
  };
}

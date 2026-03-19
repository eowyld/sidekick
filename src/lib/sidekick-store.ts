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
  done: boolean;
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
export interface Work {
  id: string;
  title: string;
  [key: string]: unknown;
}
export interface SyncState {
  lastSync?: string;
  [key: string]: unknown;
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
    sync: SyncState;
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
  preferences: {
    enabledModules: {
      live: boolean;
      phono: boolean;
      admin: boolean;
      marketing: boolean;
      edition: boolean;
      revenus: boolean;
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
  preferences: {
    enabledModules: {
      live: true,
      phono: true,
      admin: true,
      marketing: true,
      edition: true,
      revenus: true
    }
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
    tasks: Array.isArray(partial.tasks) ? partial.tasks : DEFAULT_SIDEKICK_DATA.tasks,
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
    edition: { ...DEFAULT_SIDEKICK_DATA.edition, ...partial.edition },
    incomes: { ...DEFAULT_SIDEKICK_DATA.incomes, ...partial.incomes },
    live: { ...DEFAULT_SIDEKICK_DATA.live, ...partial.live },
    marketing: { ...DEFAULT_SIDEKICK_DATA.marketing, ...partial.marketing },
    phono: { ...DEFAULT_SIDEKICK_DATA.phono, ...partial.phono },
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

/**
 * Store persistant Sidekick (localStorage).
 * Une seule clé "sidekick-data" pour tout effacer facilement.
 *
 * Convention : toutes les infos de tous les modules vivent ici.
 * - Ajouter un module : étendre SidekickData + DEFAULT_SIDEKICK_DATA.
 * - Lire/écrire : useSidekickData() → data.<module>.<slice>, setData(prev => ({ ...prev, <module>: { ... } })).
 * - Reset : /reset-data ou "npm run reset-data".
 */

export const SIDEKICK_STORAGE_KEY = "sidekick-data";

// --- Tasks ---
export interface Todo {
  id: string;
  title: string;
  done: boolean;
}

// --- Admin ---
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
  | "directeur_musical";

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
  versions: TrackVersion[];
  notes: string;
  [key: string]: unknown;
}

export type AlbumType = "album" | "ep" | "single";

export interface Album {
  id: string;
  title: string;
  type: AlbumType;
  releaseDate: string;
  upcEan: string;
  /** IDs des titres du catalogue (phono.tracks). */
  trackIds: string[];
  notes: string;
  /** Image de pochette (data URL base64). */
  cover?: string;
  [key: string]: unknown;
}
export interface Session {
  id: string;
  title: string;
  date?: string;
  [key: string]: unknown;
}

// --- Store global ---
export interface SidekickData {
  tasks: Todo[];
  admin: {
    structures: AdminStructure[];
    procedures: AdminProcedure[];
    documents: AdminDocument[];
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
  };
  phono: {
    albums: Album[];
    tracks: Track[];
    sessions: Session[];
  };
}

export const DEFAULT_SIDEKICK_DATA: SidekickData = {
  tasks: [],
  admin: {
    structures: [],
    procedures: [],
    documents: [],
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
    events: []
  },
  phono: {
    albums: [],
    tracks: [],
    sessions: []
  }
};

/**
 * Fusionne des données partielles (ex. ancien localStorage) avec les défauts.
 * Garantit toujours la structure complète pour tous les modules.
 */
export function mergeWithDefaults(
  partial: Partial<SidekickData> | null
): SidekickData {
  if (!partial || typeof partial !== "object") return DEFAULT_SIDEKICK_DATA;
  return {
    ...DEFAULT_SIDEKICK_DATA,
    ...partial,
    tasks: Array.isArray(partial.tasks) ? partial.tasks : DEFAULT_SIDEKICK_DATA.tasks,
    admin: { ...DEFAULT_SIDEKICK_DATA.admin, ...partial.admin },
    calendar: { ...DEFAULT_SIDEKICK_DATA.calendar, ...partial.calendar },
    contacts: { ...DEFAULT_SIDEKICK_DATA.contacts, ...partial.contacts },
    dashboard: { ...DEFAULT_SIDEKICK_DATA.dashboard, ...partial.dashboard },
    edition: { ...DEFAULT_SIDEKICK_DATA.edition, ...partial.edition },
    incomes: { ...DEFAULT_SIDEKICK_DATA.incomes, ...partial.incomes },
    live: { ...DEFAULT_SIDEKICK_DATA.live, ...partial.live },
    marketing: { ...DEFAULT_SIDEKICK_DATA.marketing, ...partial.marketing },
    phono: { ...DEFAULT_SIDEKICK_DATA.phono, ...partial.phono }
  };
}

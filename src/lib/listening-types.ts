/**
 * Types partagés entre l'app (composeur, analytics) et la page publique.
 *
 * `snapshot` porte la copie de sécurité : la page publique n'interroge jamais
 * le catalogue, ce qui garantit qu'un titre modifié ou supprimé ne casse pas
 * une page déjà envoyée à un label.
 */

export interface ListeningItemSnapshot {
  title: string;
  mainArtist: string;
  guestArtists: string[];
  versionLabel?: string;
  isrc?: string;
  role?: string;
  label?: string;
  releaseDate?: string;
  genre?: string;
  cover?: string;
}

export type ListeningItemKind = "track" | "mix" | "podcast";

export interface ListeningItem {
  id: string;
  position: number;
  /** Nom du projet quand l'item vient d'un album ajouté en bloc. */
  groupLabel?: string;
  kind: ListeningItemKind;
  sourceId: string;
  versionId?: string;
  snapshot: ListeningItemSnapshot;
  audioPath: string;
  durationMs: number;
  peaks: number[];
}

export interface ListeningLink {
  id: string;
  slug: string;
  title: string;
  introMessage: string;
  coverPath?: string;
  /** Jamais l'empreinte elle-même : seulement l'existence d'un mot de passe. */
  hasPassword: boolean;
  expiresAt?: string;
  allowDownload: boolean;
  presskitUrl?: string;
  /** Propre à ce lien, à côté du réglage de compte (`artist_logo_exports.listening`) : les deux doivent être vrais. */
  showLogo: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: ListeningItem[];
}

/** Charge utile envoyée à la page publique. Ne contient aucune URL audio. */
export interface PublicListeningLink {
  slug: string;
  title: string;
  introMessage: string;
  coverUrl?: string;
  artistName: string;
  /** Route du logo de l'artiste, absente s'il n'en a pas ou l'a masqué ici. */
  logoUrl?: string;
  requiresPassword: boolean;
  expiresAt?: string;
  allowDownload: boolean;
  presskitUrl?: string;
  items: Array<Omit<ListeningItem, "audioPath" | "sourceId" | "versionId">>;
}

export type LinkState = "ok" | "gone" | "expired" | "locked";

export interface ListeningPlayStat {
  itemId: string;
  listenedMs: number;
  maxPositionMs: number;
  playCount: number;
  completed: boolean;
  downloaded: boolean;
}

export interface ListeningSessionStat {
  id: string;
  visitorName?: string;
  createdAt: string;
  lastSeenAt: string;
  plays: ListeningPlayStat[];
}

/**
 * Agrégat par titre, sessions identifiées et anonymes confondues. Les positions
 * atteintes ne sont rattachées à personne : elles servent à dessiner où
 * l'attention décroche dans le morceau.
 */
export interface ListeningItemStat {
  itemId: string;
  listeners: number;
  listenedMs: number;
  /** Position la plus lointaine atteinte, une entrée par session. */
  reachedMs: number[];
  completions: number;
  /** Lectures au-delà de la première, toutes sessions confondues. */
  replays: number;
  downloads: number;
}

export interface ListeningLinkStats {
  linkId: string;
  sessionCount: number;
  /** Date d'ouverture de chaque session, pour la courbe d'activité. */
  sessionDates: string[];
  totalListenedMs: number;
  itemStats: Record<string, ListeningItemStat>;
  identifiedSessions: ListeningSessionStat[];
  anonymousSessionCount: number;
  /** Agrégat anonyme : itemId → millisecondes écoutées, tous visiteurs confondus. */
  anonymousListenedMsByItem: Record<string, number>;
  downloadCount: number;
  averageCompletion: number;
  lastPlayedAt?: string;
}

export interface ListeningInvite {
  id: string;
  linkId: string;
  contactId?: string;
  contactName: string;
  contactEmail: string;
  sentAt: string;
  firstOpenedAt?: string;
}

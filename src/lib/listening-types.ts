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

export type ListeningItemKind = "track" | "podcast";

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

export interface ListeningLinkStats {
  linkId: string;
  sessionCount: number;
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

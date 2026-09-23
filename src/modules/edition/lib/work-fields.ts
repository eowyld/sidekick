import type { Person, PersonRole, SplitEntry, Work } from "@/lib/sidekick-store";

export const ALL_ROLES: { value: PersonRole; label: string }[] = [
  { value: "author", label: "Auteur" },
  { value: "composer", label: "Compositeur" },
  { value: "arranger", label: "Arrangeur" },
  { value: "adapter", label: "Adaptateur" },
];

export const EXPLOITATION_TYPES: { value: Work["exploitationTypes"][number]; label: string }[] = [
  { value: "streaming", label: "Streaming" },
  { value: "live", label: "Live" },
  { value: "sync", label: "Synchronisation" },
  { value: "cover", label: "Reprise" },
];

export const PERSON_COLORS_HEX = ["#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#f97316", "#14b8a6"];
export const PUBLISHER_COLOR = "#eab308";

export const DEFAULT_WORK: Omit<Work, "id"> = {
  artistName: "",
  title: "",
  status: "in-progress",
  persons: [],
  depRepartition: { authors: 50, composers: 50, publishers: 0 },
  drmRepartition: { authors: 50, composers: 50, publishers: 0 },
  splitsAuthors: [],
  splitsComposers: [],
  selfPublished: true,
  externalPublishers: [],
  iswc: "",
  firstExploitationDate: "",
  genre: "",
  duration: "",
  files: {},
  exploitationTypes: [],
  firstBroadcaster: "",
  worldwideRights: true,
  territories: [],
  notes: "",
  linkedTrackIds: [],
};

export function roleLabel(role: PersonRole): string {
  return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
}

/** « Prénom Nom (Pseudo) », ou ce qui en est renseigné. */
export function personDisplayName(p: Pick<Person, "firstName" | "name" | "pseudonym">): string {
  const full = [p.firstName, p.name].filter(Boolean).join(" ").trim();
  if (full && p.pseudonym) return `${full} (${p.pseudonym})`;
  return full || p.pseudonym || "Sans nom";
}

/** Nom court pour une liste : le pseudonyme d'abord, c'est ainsi qu'on se connaît au studio. */
export function personShortName(p: Pick<Person, "firstName" | "name" | "pseudonym">): string {
  return p.pseudonym || [p.firstName, p.name].filter(Boolean).join(" ").trim() || "Sans nom";
}

export function sumSplits(entries: SplitEntry[]): number {
  return Math.round(entries.reduce((s, e) => s + e.pct, 0) * 100) / 100;
}

export const isAuthorRole = (p: Person) => p.roles.includes("author") || p.roles.includes("adapter");
export const isMusicRole = (p: Person) => p.roles.includes("composer") || p.roles.includes("arranger");

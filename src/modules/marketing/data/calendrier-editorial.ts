import type { MarketingEvent } from "@/lib/sidekick-store";

export const EDITORIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "newsletter", "presse"] as const;
export type EditorialPlatform = (typeof EDITORIAL_PLATFORMS)[number] | string;

export const EDITORIAL_STATUSES = ["idee", "a_produire", "planifie", "publie"] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

export const EDITORIAL_CONTENT_TYPES = ["post", "story", "video_verticale", "video_horizontale", "texte"] as const;
export type EditorialContentType = (typeof EDITORIAL_CONTENT_TYPES)[number] | string;

export interface EditorialEvent extends MarketingEvent {
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // HH:mm
  platforms: EditorialPlatform[];
  status: EditorialStatus;
  contentTypes: EditorialContentType[];
  text?: string;
  attachments?: string[];
  notes?: string;
}

export interface EditorialEventForm {
  title: string;
  date: string;
  time: string;
  platforms: EditorialPlatform[];
  status: EditorialStatus;
  contentTypes: EditorialContentType[];
  text: string;
  attachments: string[];
  notes: string;
}

export const DEFAULT_EDITORIAL_EVENT_FORM: EditorialEventForm = {
  title: "",
  date: "",
  time: "",
  platforms: ["instagram"],
  status: "idee",
  contentTypes: ["post"],
  text: "",
  attachments: [],
  notes: ""
};

function isEditorialPlatform(value: unknown): value is EditorialPlatform {
  return typeof value === "string" && value.trim().length > 0;
}

function isEditorialStatus(value: unknown): value is EditorialStatus {
  return typeof value === "string" && (EDITORIAL_STATUSES as readonly string[]).includes(value);
}

function isEditorialContentType(value: unknown): value is EditorialContentType {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeEditorialEvent(event: MarketingEvent): EditorialEvent {
  const rawPlatforms = Array.isArray(event.platforms)
    ? event.platforms
    : typeof event.platform === "string"
      ? [event.platform]
      : [];
  const rawContentTypes = Array.isArray(event.contentTypes)
    ? event.contentTypes
    : typeof event.contentType === "string"
      ? [event.contentType]
      : [];

  const platforms = rawPlatforms
    .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
    .filter(isEditorialPlatform);
  const contentTypes = rawContentTypes
    .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
    .filter(isEditorialContentType);

  return {
    id: String(event.id),
    title: String(event.title ?? "Contenu sans titre"),
    date: typeof event.date === "string" ? event.date : "",
    time: typeof event.time === "string" ? event.time : "",
    platforms: platforms.length > 0 ? platforms : ["instagram"],
    status: isEditorialStatus(event.status) ? event.status : "idee",
    contentTypes: contentTypes.length > 0 ? contentTypes : ["post"],
    text: typeof event.text === "string" ? event.text : "",
    attachments: Array.isArray(event.attachments)
      ? event.attachments.filter((v): v is string => typeof v === "string")
      : [],
    notes: typeof event.notes === "string" ? event.notes : ""
  };
}


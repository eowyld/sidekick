"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { tourOptions } from "../lib/live-links";
import { LiveHeader, WriteError } from "./shared/LiveUI";
import { Fragment, useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowUpDown,
  ChevronRight,
  Flame,
  Globe,
  Instagram,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  Moon,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Tag,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { mutate } from "swr";
import { useContactsData, type Contact } from "@/hooks/useContactsData";
import {
  useLiveData,
  type ContactTouchpoint,
  type ProspectionEntry,
  type ReliabilityTier,
} from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["À contacter", "En attente", "À relancer", "En discussion", "Accepté", "Archivé"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_RANK: Record<Status, number> = {
  "À contacter": 0,
  "En attente": 1,
  "À relancer": 2,
  "En discussion": 3,
  "Accepté": 4,
  "Archivé": 5,
};

const STATUS_FILTER_ALL = "__all__";
const TOUR_FILTER_ALL = "__all__";
const AUTO_RELANCE_DAYS = 21;
const AUTO_RELANCE_STATUSES: Status[] = ["En attente", "En discussion"];

type MomentumLevel = "hot" | "active" | "warm" | "idle" | "inactive";
type TouchpointChannel = ContactTouchpoint["channel"];
type TouchpointDirection = Exclude<ContactTouchpoint["direction"], undefined>;

type TouchpointDraft = {
  date: string;
  subject: string;
  channel: TouchpointChannel;
  direction: TouchpointDirection;
  extraDirections: TouchpointDirection[];
};

const emptyForm = {
  venueName: "",
  city: "",
  contact: "",
  email: "",
  instagram: "",
  facebook: "",
  phone: "",
  status: "À contacter" as Status,
  notes: "",
  reliabilityTier: "neutral" as ReliabilityTier,
  tourId: "",
};

const SORTABLE_COLUMNS = [
  { key: "venueName", label: "Lieu" },
  { key: "city", label: "Ville" },
  { key: "momentum", label: "Momentum" },
  { key: "status", label: "Statut" },
  { key: "lastContact", label: "Dernier contact" },
] as const;

type SortKey = (typeof SORTABLE_COLUMNS)[number]["key"];

// Seuils calibrés sur l'engagement entrant (réponses), pas les envois
const THRESHOLDS: Record<ReliabilityTier, { hot: number; active: number; warm: number }> = {
  easy:    { hot: 7,  active: 3.5, warm: 1 },
  neutral: { hot: 9,  active: 5,   warm: 1.5 },
  hard:    { hot: 13, active: 7,   warm: 2.5 },
};

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(value: string) {
  return removeAccents(value).toLowerCase().trim();
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "fr", { sensitivity: "base", numeric: true });
}

function toIso(date: string): string {
  if (!date) return "";
  if (date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return date;
}

function getDateTimestamp(value?: string) {
  if (!value) return null;
  const timestamp = new Date(toIso(value)).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateDisplay(date?: string): string {
  if (!date) return "—";
  const d = new Date(toIso(date));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function normalizeInstagramHandle(value: string) {
  return value.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
}

function getInstagramUrl(value: string) {
  const handle = normalizeInstagramHandle(value);
  return handle ? `https://instagram.com/${handle}` : "";
}

function normalizeFacebookHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?facebook\.com\//i, "")
    .replace(/\/+$/, "");
}

function getFacebookUrl(value: string) {
  const handle = normalizeFacebookHandle(value);
  return handle ? `https://facebook.com/${handle}` : "";
}

function coerceStatus(status: string): Status {
  const normalized = normalizeText(status);
  return STATUS_OPTIONS.find((option) => normalizeText(option) === normalized) ?? "À contacter";
}

function getStatusAfterTouchpoint(touchpoint: ContactTouchpoint): Status | null {
  if (touchpoint.channel === "in-person") return "En discussion";
  if (touchpoint.direction === "inbound") return "En discussion";
  if (touchpoint.direction === "replied") return "En discussion";
  if (touchpoint.direction === "outbound" || touchpoint.direction === "no-answer") return "En attente";
  return null;
}

// Le momentum mesure l'engagement de la SALLE, pas ton activité d'envoi.
// Outbound quasi-zéro : tu fais ton travail mais ça ne prouve pas leur intérêt.
// Inbound/replied : ils réagissent → vrai signal d'engagement.
function getBaseTouchpointPoints(tp: ContactTouchpoint): number {
  if (tp.eventType === "status-change") {
    if (!tp.statusValue || !tp.previousStatus) return 0;
    if (tp.statusValue === "Archivé") return 0;
    const oldRank = STATUS_RANK[coerceStatus(tp.previousStatus)];
    const newRank = STATUS_RANK[coerceStatus(tp.statusValue)];
    const improvement = newRank - oldRank;
    if (improvement === 0) return 0;
    return improvement > 0 ? 8 : -8;
  }

  // Rencontre physique = signal maximal (engagement bilatéral implicite)
  if (tp.channel === "in-person") return 10;

  if (tp.channel === "phone") {
    if (tp.direction === "no-answer") return 0;
    if (tp.direction === "inbound")  return 7;  // ils t'ont appelé
    return 4;                                    // appel passé avec échange réel
  }

  if (tp.channel === "mail") {
    if (tp.direction === "inbound")  return 8;  // ils ont répondu
    if (tp.direction === "replied")  return 3;  // conversation en cours
    return 0.05;                                 // tu as envoyé — quasi zéro
  }

  if (tp.channel === "instagram") {
    if (tp.direction === "inbound")  return 6;
    if (tp.direction === "replied")  return 2.5;
    return 0.05;
  }

  return 0;
}

function isPositiveStatusForMomentumReset(value?: string) {
  const status = coerceStatus(value ?? "");
  return status === "En discussion" || status === "Accepté";
}

function computeMomentumScore(entry: ProspectionEntry): number {
  const resetTimestamp = (entry.touchpoints ?? [])
    .filter((tp) => tp.eventType === "status-change" && isPositiveStatusForMomentumReset(tp.statusValue))
    .map((tp) => getDateTimestamp(tp.date))
    .reduce<number | null>((latest, ts) => {
      if (ts === null) return latest;
      if (latest === null) return ts;
      return Math.max(latest, ts);
    }, null);

  return entry.touchpoints.reduce((acc, tp) => {
    const base = getBaseTouchpointPoints(tp);
    if (base === 0) return acc;
    const ts = getDateTimestamp(tp.date);
    if (ts === null) return acc;
    const effectiveTimestamp = resetTimestamp !== null ? Math.max(ts, resetTimestamp) : ts;
    const ageDays = Math.max(0, (Date.now() - effectiveTimestamp) / (1000 * 60 * 60 * 24));
    return acc + base * Math.pow(0.5, ageDays / 14);
  }, 0);
}

function getMomentumLevel(score: number, tier: ReliabilityTier): MomentumLevel {
  const t = THRESHOLDS[tier];
  if (score > t.hot)   return "hot";
  if (score > t.active) return "active";
  if (score > t.warm)  return "warm";
  if (score > 0.03)    return "idle";   // tu as envoyé des messages, mais aucune réponse
  return "inactive";
}

function getMomentumMeta(level: MomentumLevel) {
  switch (level) {
    case "hot":
      return { label: "Brûlant", icon: Flame, className: "bg-[rgba(240,255,0,0.12)] text-[#F0FF00]" };
    case "active":
      return { label: "Actif", icon: Zap, className: "bg-blue-500/15 text-blue-300" };
    case "warm":
      return { label: "Tiède", icon: Minus, className: "bg-orange-500/15 text-orange-300" };
    case "idle":
      return { label: "En veille", icon: Moon, className: "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/45" };
    default:
      return { label: "Inactif", icon: X, className: "bg-[rgba(245,245,245,0.04)] text-[#F5F5F5]/25" };
  }
}

function getLastContactFromTouchpoints(touchpoints: ContactTouchpoint[]) {
  const dated = touchpoints
    .map((tp) => ({ ...tp, ts: getDateTimestamp(tp.date) }))
    .filter((tp) => tp.ts !== null) as Array<ContactTouchpoint & { ts: number }>;
  if (dated.length === 0) return undefined;
  dated.sort((a, b) => b.ts - a.ts);
  return dated[0].date;
}

function computeDisplayStatus(entry: { status: string; lastContact?: string }): Status {
  const stored = coerceStatus(entry.status);
  if (!AUTO_RELANCE_STATUSES.includes(stored)) return stored;
  if (!entry.lastContact) return stored;
  const ts = getDateTimestamp(entry.lastContact);
  if (ts === null) return stored;
  const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return daysSince >= AUTO_RELANCE_DAYS ? "À relancer" : stored;
}

function statusBadgeClass(status: string) {
  const base = "inline-flex items-center rounded-md border-0 px-2.5 py-1 text-xs font-semibold tracking-tight shrink-0";
  switch (coerceStatus(status)) {
    case "À contacter":
      return `${base} bg-yellow-500/20 text-yellow-300`;
    case "En attente":
      return `${base} bg-orange-500/20 text-orange-300`;
    case "À relancer":
      return `${base} bg-red-500/20 text-red-300`;
    case "En discussion":
      return `${base} bg-blue-500/20 text-blue-300`;
    case "Accepté":
      return `${base} bg-emerald-500/20 text-emerald-300`;
    default:
      return `${base} bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70`;
  }
}

function getDefaultTouchpointDraft(): TouchpointDraft {
  const today = new Date().toISOString().slice(0, 10);
  return { date: today, subject: "", channel: "instagram", direction: "outbound", extraDirections: [] };
}

function splitContactName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(" ") };
}

function getContactDisplayName(contact: Contact) {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (contact.email.trim()) return contact.email;
  if (contact.phone.trim()) return contact.phone;
  return "Sans nom";
}

// ─── Design helpers ────────────────────────────────────────────────────────────

type ChannelConfig = {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
};

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  mail:        { icon: Mail,           color: "#F0FF00",  bg: "rgba(240,255,0,0.12)",    label: "Mail" },
  instagram:   { icon: MessageSquare,  color: "#c084fc",  bg: "rgba(192,132,252,0.12)",  label: "Message" },
  phone:       { icon: Phone,          color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",   label: "Téléphone" },
  "in-person": { icon: Users,          color: "#34d399",  bg: "rgba(52,211,153,0.12)",   label: "En personne" },
  facebook:    { icon: Globe,          color: "#93c5fd",  bg: "rgba(147,197,253,0.12)",  label: "Facebook" },
  "status-change": { icon: Tag,        color: "#9ca3af",  bg: "rgba(156,163,175,0.08)",  label: "Statut" },
};

function getChannelConfig(channel: string): ChannelConfig {
  return CHANNEL_CONFIG[channel] ?? { icon: MessageSquare, color: "#9ca3af", bg: "rgba(156,163,175,0.08)", label: channel };
}

/** Semi-circle SVG momentum gauge */
function MomentumGauge({ score, tier, level }: { score: number; tier: string; level: string }) {
  const maxScore = tier === "easy" ? 14 : tier === "hard" ? 26 : 18;
  const pct = Math.min(1, Math.max(0, score / maxScore));
  const arcLen = Math.PI * 40; // πr, r=40
  const dashOffset = arcLen * (1 - pct);

  const colors: Record<string, string> = {
    hot:      "#F0FF00",
    active:   "#60a5fa",
    warm:     "#fb923c",
    idle:     "#9ca3af",
    inactive: "#374151",
  };
  const fillColor = colors[level] ?? "#374151";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="96" height="58" viewBox="0 0 96 58" fill="none" aria-hidden="true">
        {/* Track */}
        <path
          d="M 8,52 A 40,40 0 0 1 88,52"
          stroke="rgba(245,245,245,0.08)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        {/* Fill */}
        <path
          d="M 8,52 A 40,40 0 0 1 88,52"
          stroke={fillColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={dashOffset}
          fill="none"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
        {/* Glow dot at end of fill */}
        {pct > 0.02 && (
          (() => {
            const angle = Math.PI - pct * Math.PI;
            const ex = 48 + 40 * Math.cos(angle);
            const ey = 52 - 40 * Math.sin(angle);
            return (
              <circle cx={ex} cy={ey} r="4" fill={fillColor} style={{ filter: `drop-shadow(0 0 4px ${fillColor})` }} />
            );
          })()
        )}
      </svg>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: fillColor, marginTop: "-14px" }}>
        {level === "hot" ? "Brûlant" : level === "active" ? "Actif" : level === "warm" ? "Tiède" : level === "idle" ? "En veille" : "Inactif"}
      </span>
    </div>
  );
}

/** Contact field row — mirrors the Contacts module design */
function DetailField({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm text-[#F5F5F5]/80">{children}</div>
    </div>
  );
}

export function ProspectionPage() {
  const { prospection: entries, setProspection: setEntries, productions, loading, error, sliceError } = useLiveData();
  const { contacts, setContacts, loading: contactsLoading, error: contactsError } = useContactsData();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const params = useSearchParams();
  // Arrivée depuis une fiche de tournée : la liste s'ouvre sur ses lieux.
  const [tourFilter, setTourFilter] = useState<string>(params.get("tourId") ?? TOUR_FILTER_ALL);
  const [sortKey, setSortKey] = useState<SortKey>("venueName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [touchpointDrafts, setTouchpointDrafts] = useState<Record<string, TouchpointDraft>>({});
  const [contactNotesDrafts, setContactNotesDrafts] = useState<Record<string, string>>({});

  const isCreating = editingId === "new";
  const dialogOpen = editingId !== null;

  const closeDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImportDialogOpen(false);
  };

  const updateEntry = (id: string, updater: (entry: ProspectionEntry) => ProspectionEntry) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)));
  };

  const updateEntryTouchpoints = (entry: ProspectionEntry, touchpoints: ContactTouchpoint[]) => ({
    ...entry,
    touchpoints,
    lastContact: getLastContactFromTouchpoints(touchpoints),
  });

  const startCreate = () => {
    setEditingId("new");
    setForm({ ...emptyForm, tourId: tourFilter === TOUR_FILTER_ALL ? "" : tourFilter });
  };

  const startEdit = (entry: ProspectionEntry) => {
    setEditingId(entry.id);
    setForm({
      venueName: entry.venueName,
      city: entry.city,
      contact: entry.contact,
      email: entry.email,
      instagram: entry.instagram ?? "",
      facebook: entry.facebook ?? "",
      phone: entry.phone,
      status: coerceStatus(entry.status),
      notes: entry.notes ?? "",
      reliabilityTier: entry.reliabilityTier ?? "neutral",
      tourId: entry.tourId ?? "",
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleInlineStatusChange = (id: string, status: Status) => {
    updateEntry(id, (entry) => {
      const statusLog: ContactTouchpoint = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        channel: "in-person",
        eventType: "status-change",
        statusValue: status,
        previousStatus: entry.status,
        note: `Changement de statut : "${status}"`,
      };
      const touchpoints = [statusLog, ...(entry.touchpoints ?? [])];
      return {
        ...updateEntryTouchpoints(entry, touchpoints),
        status,
      };
    });
  };

  const maybeCreateContact = ({
    contactName,
    city,
    email,
    instagram,
    phone,
  }: {
    contactName: string;
    city: string;
    email: string;
    instagram: string;
    phone: string;
  }) => {
    if (!contactName || contactsLoading || contactsError) return;
    const normalizedName = normalizeText(contactName);
    const alreadyExists = contacts.some((contact) => normalizeText(getContactDisplayName(contact)) === normalizedName);
    if (alreadyExists) return;

    const { firstName, lastName } = splitContactName(contactName);
    setContacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        firstName,
        lastName,
        role: "Programmateur de salle",
        city,
        email,
        instagram,
        phone,
        notes: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const saveEntry = () => {
    const venueName = form.venueName.trim();
    if (!venueName) return;

    const city = form.city.trim();
    const contact = form.contact.trim();
    const email = form.email.trim();
    const instagram = normalizeInstagramHandle(form.instagram);
    const facebook = normalizeFacebookHandle(form.facebook);
    const phone = form.phone.trim();
    const notes = form.notes.trim();

    if (editingId === "new") {
      const touchpoints: ContactTouchpoint[] = [];
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          venueName,
          city,
          contact,
          email,
          instagram,
          facebook,
          phone,
          status: form.status,
          notes: notes || undefined,
          touchpoints,
          reliabilityTier: form.reliabilityTier,
          lastContact: undefined,
          tourId: form.tourId || undefined,
        },
        ...prev,
      ]);
      maybeCreateContact({ contactName: contact, city, email, instagram, phone });
    } else if (typeof editingId === "string") {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                venueName,
                city,
                contact,
                email,
                instagram,
                facebook,
                phone,
                status: form.status,
                notes: notes || undefined,
                reliabilityTier: form.reliabilityTier,
                tourId: form.tourId || undefined,
              }
            : entry
        )
      );
    }

    closeDialog();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveEntry();
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setDeleteConfirmId(null);
    if (editingId === id) closeDialog();
  };

  const selectContactFromImport = (contact: Contact) => {
    setForm((prev) => ({
      ...prev,
      contact: getContactDisplayName(contact),
      email: contact.email ?? "",
      instagram: contact.instagram ?? "",
      phone: contact.phone ?? "",
      city: prev.city || contact.city || "",
    }));
    setImportDialogOpen(false);
  };

  const addTouchpoint = (entryId: string) => {
    const draft = touchpointDrafts[entryId] ?? getDefaultTouchpointDraft();
    if (!draft.date) return;

    const directions =
      draft.channel === "in-person"
        ? [undefined]
        : draft.channel === "phone"
          ? [draft.direction]
          : draft.direction === "outbound"
            ? ["outbound" as const]
            : Array.from(new Set([draft.direction, ...draft.extraDirections].filter((value) => value === "inbound" || value === "replied")));

    const touchpointsToAdd: ContactTouchpoint[] = directions.map((direction) => ({
      id: crypto.randomUUID(),
      date: draft.date,
      channel: draft.channel,
      direction,
      eventType: "contact",
      note: draft.subject.trim() || undefined,
    }));

    updateEntry(entryId, (entry) => {
      const touchpoints = [...touchpointsToAdd, ...(entry.touchpoints ?? [])];
      const nextStatus = touchpointsToAdd
        .map((tp) => getStatusAfterTouchpoint(tp))
        .find((status): status is Status => Boolean(status));
      return {
        ...updateEntryTouchpoints(entry, touchpoints),
        status: nextStatus ?? entry.status,
      };
    });

    setTouchpointDrafts((prev) => ({
      ...prev,
      [entryId]: { ...getDefaultTouchpointDraft(), channel: draft.channel },
    }));
  };

  const deleteTouchpoint = (entryId: string, touchpointId: string) => {
    updateEntry(entryId, (entry) => {
      const touchpoints = (entry.touchpoints ?? []).filter((tp) => tp.id !== touchpointId);
      return updateEntryTouchpoints(entry, touchpoints);
    });
  };

  const updateTouchpointDraft = (entryId: string, patch: Partial<TouchpointDraft>) => {
    setTouchpointDrafts((prev) => {
      const current = prev[entryId] ?? getDefaultTouchpointDraft();
      const next = { ...current, ...patch };
      if (next.channel === "in-person") {
        next.direction = "outbound";
        next.extraDirections = [];
      }
      if (next.channel === "phone") {
        next.extraDirections = [];
      }
      if ((next.channel === "mail" || next.channel === "instagram") && next.direction === "outbound") {
        next.extraDirections = [];
      }
      return { ...prev, [entryId]: next };
    });
  };

  const normalizedSearch = normalizeText(searchTerm);

  const entriesWithDerived = useMemo(
    () =>
      entries.map((entry) => {
        const score = computeMomentumScore(entry);
        const level = getMomentumLevel(score, entry.reliabilityTier ?? "neutral");
        const lastContact = getLastContactFromTouchpoints(entry.touchpoints ?? []);
        return {
          ...entry,
          momentumScore: score,
          momentumLevel: level,
          computedLastContact: lastContact,
        };
      }),
    [entries]
  );

  const activeEntries = entriesWithDerived.filter((entry) => coerceStatus(entry.status) !== "Archivé");
  const archivedEntries = entriesWithDerived.filter((entry) => coerceStatus(entry.status) === "Archivé");

  const filteredByTour = tourFilter === TOUR_FILTER_ALL ? activeEntries : activeEntries.filter((entry) => entry.tourId === tourFilter);

  const filteredByStatus =
    statusFilter === STATUS_FILTER_ALL
      ? filteredByTour
      : filteredByTour.filter((entry) => normalizeText(computeDisplayStatus({ status: entry.status, lastContact: entry.computedLastContact })) === normalizeText(statusFilter));

  const filteredEntries =
    normalizedSearch === ""
      ? filteredByStatus
      : filteredByStatus.filter((entry) =>
          [entry.venueName, entry.city, entry.contact, entry.email, entry.instagram ?? "", entry.facebook ?? "", entry.phone, entry.notes ?? ""].some((value) =>
            normalizeText(value).includes(normalizedSearch)
          )
        );

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    if (sortKey === "status") {
      return (STATUS_RANK[coerceStatus(a.status)] - STATUS_RANK[coerceStatus(b.status)]) * direction;
    }
    if (sortKey === "lastContact") {
      const aTs = getDateTimestamp(a.computedLastContact);
      const bTs = getDateTimestamp(b.computedLastContact);
      if (aTs === null && bTs === null) return 0;
      if (aTs === null) return 1;
      if (bTs === null) return -1;
      return (aTs - bTs) * direction;
    }
    if (sortKey === "momentum") {
      return (a.momentumScore - b.momentumScore) * direction;
    }
    return compareText(a[sortKey] ?? "", b[sortKey] ?? "") * direction;
  });

  const statusOptionsForFilter = Array.from(new Set(activeEntries.map((entry) => computeDisplayStatus({ status: entry.status, lastContact: entry.computedLastContact })))).sort(
    (a, b) => STATUS_RANK[a] - STATUS_RANK[b]
  );

  const importableContacts = [...contacts].sort((a, b) => compareText(getContactDisplayName(a), getContactDisplayName(b)));
  const tourChoices = tourOptions(productions);

  if (loading) return <PageLoader />;
  const loadError = sliceError("prospection");
  if (loadError) {
    return (
      <PageError
        title="Impossible de charger la prospection live"
        description={loadError}
        onRetry={() => mutate("user_live")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <LiveHeader title="Prospection" description="Trouve tes prochaines scènes et garde le fil de chaque échange." actions={<Button onClick={startCreate} size="sm"><Plus size={14} className="mr-2"/>Ajouter un prospect</Button>} />
      <WriteError message={error} />

      <div className="border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)]">
        <div className="flex flex-col gap-3 border-b border-[rgba(245,245,245,0.08)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Target size={13} className="shrink-0 text-[#F5F5F5]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40">{sortedEntries.length} prospect{sortedEntries.length !== 1 ? "s" : ""}</span>
          </div>
          {entries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un lieu..." className="h-7 w-full text-xs sm:w-56" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-full text-xs sm:w-[170px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_FILTER_ALL}>Tous les statuts</SelectItem>
                  {statusOptionsForFilter.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tourChoices.length > 0 && (
                <Select value={tourFilter} onValueChange={setTourFilter}>
                  <SelectTrigger className="h-7 w-full text-xs sm:w-[200px]">
                    <SelectValue placeholder="Toutes les tournées" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TOUR_FILTER_ALL}>Toutes les tournées</SelectItem>
                    {tourChoices.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {entries.length === 0 ? (
          <EmptyState icon={Target} title="Aucune prospection en cours" description="Ajoute tes lieux cibles et suis tes relances multi-canaux." action={{ label: "Ajouter un lieu", onClick: startCreate }} />
        ) : sortedEntries.length === 0 ? (
          <NoResult query={searchTerm || undefined} hasFilters={statusFilter !== STATUS_FILTER_ALL || tourFilter !== TOUR_FILTER_ALL} onReset={() => { setSearchTerm(""); setStatusFilter(STATUS_FILTER_ALL); setTourFilter(TOUR_FILTER_ALL); }} />
        ) : (
          <div className="overflow-x-auto overflow-y-hidden [scrollbar-gutter:stable]">
            <table className="w-full min-w-[980px] border-collapse text-sm table-fixed">
              <colgroup>
                <col className="w-[32px]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.06)]">
                  <th className="px-2 py-2" />
                  {SORTABLE_COLUMNS.map(({ key, label }) => (
                    <th key={key} className={cn("px-3 py-2 text-left", key === "lastContact" && "text-center")}>
                      <button type="button" onClick={() => handleSort(key)} className={cn("inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35 hover:text-[#F5F5F5]/60", key === "lastContact" && "justify-center w-full")}>
                        {label}
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-25" />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(245,245,245,0.05)]">
                {sortedEntries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const momentum = getMomentumMeta(entry.momentumLevel);
                  const MomentumIcon = momentum.icon;
                  const instagramHandle = normalizeInstagramHandle(entry.instagram ?? "");
                  const facebookHandle = normalizeFacebookHandle(entry.facebook ?? "");
                  const draft = touchpointDrafts[entry.id] ?? getDefaultTouchpointDraft();
                  const sortedTouchpoints = [...(entry.touchpoints ?? [])].sort((a, b) => (getDateTimestamp(b.date) ?? 0) - (getDateTimestamp(a.date) ?? 0));

                  return (
                    <Fragment key={entry.id}>
                      <tr onClick={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))} className={cn("group cursor-pointer transition-colors duration-150", isExpanded ? "bg-[rgba(240,255,0,0.03)]" : "hover:bg-[rgba(245,245,245,0.025)]")}>
                        <td className="px-2 py-2.5 text-[#F5F5F5]/40">
                          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-90 text-[#F0FF00]/80")} />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#F5F5F5] truncate">{entry.venueName}</td>
                        <td className="px-3 py-2.5 text-xs text-[#F5F5F5]/60 truncate">{entry.city || <span className="text-[#F5F5F5]/25">—</span>}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", momentum.className)}>
                            <MomentumIcon className="h-3.5 w-3.5" />
                            {momentum.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className={statusBadgeClass(computeDisplayStatus({ status: entry.status, lastContact: entry.computedLastContact })) + " cursor-pointer"} aria-label={`Changer le statut de ${entry.venueName}`}>
                                {computeDisplayStatus({ status: entry.status, lastContact: entry.computedLastContact })}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuItem key={status} onSelect={() => handleInlineStatusChange(entry.id, status)}>{status}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-[#F5F5F5]/70">{formatDateDisplay(entry.computedLastContact)}</td>
                        <td className="px-3 py-2.5">
                          <div className={cn("flex justify-end gap-1 transition-opacity", isExpanded ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[#F5F5F5]/40 hover:text-[#F5F5F5]" onClick={(e) => { e.stopPropagation(); startEdit(entry); }} title="Modifier">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/40 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(entry.id); }} title="Supprimer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                            <div className="overflow-hidden">
                              <div className="border-l-2 border-[#F0FF00]/30 bg-[rgba(240,255,0,0.015)]">

                                {/* ── Header band: momentum + actions ── */}
                                <div className="flex items-center justify-between gap-4 border-b border-[rgba(245,245,245,0.06)] px-6 py-3">
                                  <div className="flex items-center gap-6">
                                    <MomentumGauge score={entry.momentumScore} tier={entry.reliabilityTier ?? "neutral"} level={entry.momentumLevel} />
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Momentum</p>
                                      <p className="text-xs text-[#F5F5F5]/60">{sortedTouchpoints.length} interaction{sortedTouchpoints.filter(t => t.eventType !== "status-change").length !== 1 ? "s" : ""}</p>
                                      {entry.computedLastContact && (
                                        <p className="text-[11px] text-[#F5F5F5]/40">Dernier : {formatDateDisplay(entry.computedLastContact)}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {coerceStatus(entry.status) !== "Archivé" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => { e.stopPropagation(); handleInlineStatusChange(entry.id, "Archivé"); }}
                                        className="gap-1.5 text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                                      >
                                        <Archive className="h-3.5 w-3.5" />
                                        Archiver
                                      </Button>
                                    )}
                                    <Button asChild size="sm" variant="secondary"><Link href={`/live/representations/nouvelle?prospectId=${entry.id}${entry.tourId ? `&tourId=${entry.tourId}` : ""}`}>Créer une date</Link></Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); startEdit(entry); }} className="gap-1.5 text-[#F5F5F5]/60 hover:text-[#F5F5F5]">
                                      <Pencil className="h-3.5 w-3.5" />
                                      Modifier
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(entry.id); }} className="gap-1.5 text-red-400/50 hover:text-red-400">
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Supprimer
                                    </Button>
                                  </div>
                                </div>

                                {/* ── Body: contact + timeline ── */}
                                <div className="grid gap-0 lg:grid-cols-[1fr_1px_1fr]">

                                  {/* Contact info */}
                                  <div className="min-w-0 px-6 py-4">
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Contact</p>
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                      <DetailField icon={UserPlus} label="Interlocuteur">
                                        {entry.contact ? <span className="font-medium text-[#F5F5F5]">{entry.contact}</span> : <span className="text-[#F5F5F5]/25">Non renseigné</span>}
                                      </DetailField>
                                      <DetailField icon={MapPin} label="Ville">
                                        {entry.city || <span className="text-[#F5F5F5]/25">Non renseignée</span>}
                                      </DetailField>
                                      <DetailField icon={Mail} label="Email">
                                        {entry.email ? (
                                          <a href={`mailto:${entry.email}`} onClick={(e) => e.stopPropagation()} className="break-all text-[#F0FF00]/80 hover:text-[#F0FF00] transition-colors">
                                            {entry.email}
                                          </a>
                                        ) : <span className="text-[#F5F5F5]/25">Non renseigné</span>}
                                      </DetailField>
                                      <DetailField icon={Phone} label="Téléphone">
                                        {entry.phone ? (
                                          <a href={`tel:${entry.phone}`} onClick={(e) => e.stopPropagation()} className="text-[#F5F5F5]/80 hover:text-[#F5F5F5] transition-colors">
                                            {entry.phone}
                                          </a>
                                        ) : <span className="text-[#F5F5F5]/25">Non renseigné</span>}
                                      </DetailField>
                                      <DetailField icon={Instagram} label="Instagram">
                                        {instagramHandle ? (
                                          <a href={getInstagramUrl(instagramHandle)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#F0FF00]/80 hover:text-[#F0FF00] transition-colors">
                                            @{instagramHandle}
                                          </a>
                                        ) : <span className="text-[#F5F5F5]/25">Non renseigné</span>}
                                      </DetailField>
                                      <DetailField icon={Globe} label="Facebook">
                                        {facebookHandle ? (
                                          <a href={getFacebookUrl(facebookHandle)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#F0FF00]/80 hover:text-[#F0FF00] transition-colors">
                                            @{facebookHandle}
                                          </a>
                                        ) : <span className="text-[#F5F5F5]/25">Non renseigné</span>}
                                      </DetailField>
                                      <DetailField icon={StickyNote} label="Notes" className="sm:col-span-2">
                                        <Textarea
                                          value={contactNotesDrafts[entry.id] ?? entry.notes ?? ""}
                                          onChange={(e) =>
                                            setContactNotesDrafts((prev) => ({
                                              ...prev,
                                              [entry.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={(e) => {
                                            const value = e.target.value.trim();
                                            updateEntry(entry.id, (current) => ({
                                              ...current,
                                              notes: value || undefined,
                                            }));
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onKeyDown={(e) => e.stopPropagation()}
                                          placeholder="Ajouter des notes sur ce contact..."
                                          rows={3}
                                          className="text-sm leading-relaxed"
                                        />
                                      </DetailField>
                                    </div>
                                  </div>

                                  {/* Divider */}
                                  <div className="hidden lg:block bg-[rgba(245,245,245,0.06)]" />

                                  {/* Timeline */}
                                  <div className="min-w-0 px-6 py-4">
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Historique</p>
                                    {sortedTouchpoints.length === 0 ? (
                                      <p className="py-4 text-center text-xs text-[#F5F5F5]/30">Aucune interaction pour le moment.</p>
                                    ) : (
                                      <div className="relative max-h-40 overflow-y-auto pr-1">
                                        {/* Vertical line */}
                                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[rgba(245,245,245,0.07)]" />
                                        <ul className="space-y-2 pl-1">
                                          {sortedTouchpoints.map((tp) => {
                                            const isStatusChange = tp.eventType === "status-change";
                                            const cfg = isStatusChange
                                              ? CHANNEL_CONFIG["status-change"]
                                              : getChannelConfig(tp.channel ?? "");
                                            const ChanIcon = cfg.icon;
                                            return (
                                              <li key={tp.id} className="group/tp flex items-start gap-3">
                                                {/* Icon dot */}
                                                <div
                                                  className="relative z-10 mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                                                  style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
                                                >
                                                  <ChanIcon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                                                </div>
                                                {/* Content */}
                                                <div className="min-w-0 flex-1 py-0.5">
                                                  {isStatusChange ? (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                        Statut → {tp.statusValue ?? "—"}
                                                      </span>
                                                      <span className="text-[10px] text-[#F5F5F5]/30">{formatDateDisplay(tp.date)}</span>
                                                    </div>
                                                  ) : (
                                                    <div>
                                                      <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                                                        {tp.note && (
                                                          <span className="ml-auto max-w-[220px] truncate text-right text-[10px] text-[#F5F5F5]/45">
                                                            {tp.note}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        {tp.channel !== "in-person" && tp.direction && (
                                                          <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                            {tp.direction === "inbound"
                                                              ? "Réponse reçue"
                                                              : tp.direction === "replied"
                                                                ? "Répondu"
                                                                : tp.direction === "no-answer"
                                                                  ? "Pas de réponse"
                                                                  : "Envoyé"}
                                                          </span>
                                                        )}
                                                        <span className="text-[10px] text-[#F5F5F5]/35">{formatDateDisplay(tp.date)}</span>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                                {/* Delete */}
                                                <button
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); deleteTouchpoint(entry.id, tp.id); }}
                                                  className="mt-1 shrink-0 text-red-400/0 transition-colors group-hover/tp:text-red-400/50 hover:!text-red-400"
                                                  aria-label="Supprimer ce touchpoint"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Quick-add form */}
                                    <div
                                      className="mt-3 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.025)] p-3"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Nouvelle interaction</p>

                                      {/* Channel chips */}
                                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                                        {([ 
                                          { value: "instagram", label: "Message",     icon: MessageSquare },
                                          { value: "mail",      label: "Mail",        icon: Mail },
                                          { value: "phone",     label: "Téléphone",   icon: Phone },
                                          { value: "in-person", label: "En personne", icon: Users },
                                        ] as { value: TouchpointChannel; label: string; icon: LucideIcon }[]).map(({ value, label, icon: ChIcon }) => {
                                          const cfg = getChannelConfig(value);
                                          const isSelected = draft.channel === value;
                                          return (
                                            <button
                                              key={value}
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); updateTouchpointDraft(entry.id, { channel: value }); }}
                                              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150"
                                              style={isSelected ? {
                                                backgroundColor: cfg.bg,
                                                color: cfg.color,
                                                border: `1px solid ${cfg.color}50`,
                                              } : {
                                                backgroundColor: "rgba(245,245,245,0.04)",
                                                color: "rgba(245,245,245,0.4)",
                                                border: "1px solid rgba(245,245,245,0.08)",
                                              }}
                                            >
                                              <ChIcon className="h-3 w-3" />
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Direction pills — only when not in-person */}
                                      {draft.channel !== "in-person" && (
                                        <div className="mb-2.5 flex flex-wrap gap-1.5">
                                          {draft.channel === "phone" ? (
                                            [
                                              { value: "outbound" as TouchpointDirection, label: "Appel passé" },
                                              { value: "inbound" as TouchpointDirection, label: "Appel reçu" },
                                              { value: "no-answer" as TouchpointDirection, label: "Pas de réponse" },
                                            ].map(({ value, label }) => {
                                              const isSelected = draft.direction === value;
                                              return (
                                                <button
                                                  key={value}
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); updateTouchpointDraft(entry.id, { direction: value }); }}
                                                  className="rounded-full px-2.5 py-1 text-xs transition-all duration-150"
                                                  style={isSelected ? {
                                                    backgroundColor: "rgba(245,245,245,0.12)",
                                                    color: "rgba(245,245,245,0.9)",
                                                    border: "1px solid rgba(245,245,245,0.2)",
                                                  } : {
                                                    backgroundColor: "rgba(245,245,245,0.03)",
                                                    color: "rgba(245,245,245,0.35)",
                                                    border: "1px solid rgba(245,245,245,0.06)",
                                                  }}
                                                >
                                                  {label}
                                                </button>
                                              );
                                            })
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); updateTouchpointDraft(entry.id, { direction: "outbound", extraDirections: [] }); }}
                                                className="rounded-full px-2.5 py-1 text-xs transition-all duration-150"
                                                style={draft.direction === "outbound" ? {
                                                  backgroundColor: "rgba(245,245,245,0.12)",
                                                  color: "rgba(245,245,245,0.9)",
                                                  border: "1px solid rgba(245,245,245,0.2)",
                                                } : {
                                                  backgroundColor: "rgba(245,245,245,0.03)",
                                                  color: "rgba(245,245,245,0.35)",
                                                  border: "1px solid rgba(245,245,245,0.06)",
                                                }}
                                              >
                                                Envoyé
                                              </button>
                                              {([
                                                { value: "inbound" as TouchpointDirection, label: "Réponse reçue" },
                                                { value: "replied" as TouchpointDirection, label: "Répondu" },
                                              ]).map(({ value, label }) => {
                                                const isSelected = draft.direction === value || draft.extraDirections.includes(value);
                                                return (
                                                  <button
                                                    key={value}
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (draft.direction === "outbound") {
                                                        updateTouchpointDraft(entry.id, { direction: value, extraDirections: [] });
                                                        return;
                                                      }
                                                      if (draft.direction === value) {
                                                        const fallback = draft.extraDirections.find((dir) => dir !== value);
                                                        if (fallback) {
                                                          updateTouchpointDraft(entry.id, {
                                                            direction: fallback,
                                                            extraDirections: draft.extraDirections.filter((dir) => dir !== fallback && dir !== value),
                                                          });
                                                        } else {
                                                          updateTouchpointDraft(entry.id, { direction: "outbound", extraDirections: [] });
                                                        }
                                                        return;
                                                      }
                                                      if (draft.extraDirections.includes(value)) {
                                                        updateTouchpointDraft(entry.id, { extraDirections: draft.extraDirections.filter((dir) => dir !== value) });
                                                      } else {
                                                        updateTouchpointDraft(entry.id, { extraDirections: [...draft.extraDirections, value] });
                                                      }
                                                    }}
                                                    className="rounded-full px-2.5 py-1 text-xs transition-all duration-150"
                                                    style={isSelected ? {
                                                      backgroundColor: "rgba(245,245,245,0.12)",
                                                      color: "rgba(245,245,245,0.9)",
                                                      border: "1px solid rgba(245,245,245,0.2)",
                                                    } : {
                                                      backgroundColor: "rgba(245,245,245,0.03)",
                                                      color: "rgba(245,245,245,0.35)",
                                                      border: "1px solid rgba(245,245,245,0.06)",
                                                    }}
                                                  >
                                                    {label}
                                                  </button>
                                                );
                                              })}
                                            </>
                                          )}
                                        </div>
                                      )}

                                      {/* Date + Objet (below) + Submit */}
                                      <div className="space-y-2">
                                        <DatePicker value={draft.date} onChange={(date) => updateTouchpointDraft(entry.id, { date })} placeholder="Date" />
                                        <Input
                                          value={draft.subject}
                                          onChange={(e) => updateTouchpointDraft(entry.id, { subject: e.target.value })}
                                          placeholder="Objet"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex justify-end">
                                          <Button type="button" size="sm" onClick={() => addTouchpoint(entry.id)} className="shrink-0">
                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                            Ajouter
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.2)]">
        <div className="flex items-center justify-between border-b border-[rgba(245,245,245,0.08)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40">
            Prospects archivés ({archivedEntries.length})
          </p>
        </div>
        {archivedEntries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[#F5F5F5]/45">Aucun prospect archivé.</p>
        ) : (
          <ul className="divide-y divide-[rgba(245,245,245,0.06)]">
            {archivedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#F5F5F5]">{entry.venueName}</p>
                  <p className="truncate text-xs text-[#F5F5F5]/50">
                    {entry.city || "Ville inconnue"} · Dernier contact: {formatDateDisplay(entry.computedLastContact)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInlineStatusChange(entry.id, "À contacter")}
                >
                  Réactiver
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[900px] gap-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {isCreating ? "Nouveau prospect" : "Modifier le prospect"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isCreating ? "Créez un nouveau prospect en remplissant le formulaire" : "Modifiez les détails du prospect"}
          </DialogDescription>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(245,245,245,0.08)] px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/35">Live · Prospection</p>
              <h2 className="mt-0.5 text-base font-bold tracking-tight text-[#F5F5F5]">{isCreating ? "Nouveau prospect" : "Modifier le prospect"}</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-0 lg:grid-cols-[1fr_1px_1fr]">

              {/* ── Colonne gauche : Lieu + Contact ── */}
              <div className="space-y-4 px-6 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Lieu</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="venueName" className="text-xs text-[#F5F5F5]/55">Nom du lieu</Label>
                    <Input id="venueName" value={form.venueName} onChange={(e) => setForm((prev) => ({ ...prev, venueName: e.target.value }))} placeholder="La Cigale" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs text-[#F5F5F5]/55">Ville</Label>
                    <Input id="city" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="Paris" />
                  </div>
                </div>

                {tourChoices.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tourId" className="text-xs text-[#F5F5F5]/55">Tournée</Label>
                    <Select value={form.tourId || "__none"} onValueChange={(v) => setForm((prev) => ({ ...prev, tourId: v === "__none" ? "" : v }))}>
                      <SelectTrigger id="tourId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Hors tournée</SelectItem>
                        {tourChoices.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t border-[rgba(245,245,245,0.06)] pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Contact</p>
                    <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[10px] text-[#F5F5F5]/50 hover:text-[#F5F5F5]" onClick={() => setImportDialogOpen(true)} disabled={contactsLoading}>
                      <UserPlus className="h-3 w-3" />
                      Importer
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="contact" className="text-xs text-[#F5F5F5]/55">Interlocuteur</Label>
                      <Input id="contact" value={form.contact} onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))} placeholder="Nom du programmateur" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs text-[#F5F5F5]/55">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="contact@salle.fr" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs text-[#F5F5F5]/55">Téléphone</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+33 6 00 00 00 00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="instagram" className="text-xs text-[#F5F5F5]/55">Instagram</Label>
                      <div className="flex">
                        <span className="inline-flex h-9 items-center border border-r-0 border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 text-sm text-[#F5F5F5]/40">@</span>
                        <Input id="instagram" value={form.instagram} onChange={(e) => setForm((prev) => ({ ...prev, instagram: normalizeInstagramHandle(e.target.value) }))} placeholder="utilisateur" className="h-9 flex-1 rounded-l-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="facebook" className="text-xs text-[#F5F5F5]/55">Facebook</Label>
                      <div className="flex">
                        <span className="inline-flex h-9 items-center border border-r-0 border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 text-sm text-[#F5F5F5]/40">@</span>
                        <Input id="facebook" value={form.facebook} onChange={(e) => setForm((prev) => ({ ...prev, facebook: normalizeFacebookHandle(e.target.value) }))} placeholder="utilisateur" className="h-9 flex-1 rounded-l-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden lg:block bg-[rgba(245,245,245,0.06)]" />

              {/* ── Colonne droite : Statut + Fiabilité + Notes ── */}
              <div className="space-y-4 px-6 py-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Statut</p>
                  <Select value={form.status} onValueChange={(value: Status) => setForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-[rgba(245,245,245,0.06)] pt-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">Niveau de fiabilité</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "easy" as const, label: "Facile", sub: "Contact direct" },
                      { value: "neutral" as const, label: "Neutre", sub: "Cas standard" },
                      { value: "hard" as const, label: "Compliqué", sub: "Grande structure" },
                    ].map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, reliabilityTier: tier.value }))}
                        className={cn(
                          "rounded border px-3 py-2 text-left transition-colors",
                          form.reliabilityTier === tier.value
                            ? "border-[#F0FF00]/60 bg-[#F0FF00]/8 text-[#F5F5F5]"
                            : "border-[rgba(245,245,245,0.08)] text-[#F5F5F5]/55 hover:border-[rgba(245,245,245,0.18)] hover:text-[#F5F5F5]"
                        )}
                      >
                        <p className="text-xs font-semibold">{tier.label}</p>
                        <p className="text-[10px] opacity-60">{tier.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[rgba(245,245,245,0.06)] pt-4 space-y-2 flex-1">
                  <Label htmlFor="notes" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35 block">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Contexte, objections, prochaine étape..."
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[rgba(245,245,245,0.08)] px-6 py-3">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>Annuler</Button>
              <Button type="submit" size="sm">{isCreating ? "Enregistrer" : "Sauvegarder"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un contact</DialogTitle>
            <DialogDescription>Remplis automatiquement le nom, l’email, l’Instagram et le téléphone.</DialogDescription>
          </DialogHeader>
          {contactsLoading ? (
            <p className="px-2 py-6 text-center text-sm text-[#F5F5F5]/50">Chargement des contacts…</p>
          ) : contactsError ? (
            <p className="px-2 py-6 text-center text-sm text-[#F5F5F5]/50">Impossible de charger les contacts pour l’import.</p>
          ) : importableContacts.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[#F5F5F5]/50">Aucun contact disponible.</p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto border border-[rgba(245,245,245,0.08)]">
              {importableContacts.map((contact) => (
                <li key={contact.id} className="border-b border-[rgba(245,245,245,0.08)] last:border-0">
                  <button type="button" className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[rgba(245,245,245,0.04)]" onClick={() => selectContactFromImport(contact)}>
                    <span className="text-sm font-medium text-[#F5F5F5]">{getContactDisplayName(contact)}</span>
                    <span className="text-xs text-[#F5F5F5]/45">{[contact.role, contact.city].filter(Boolean).join(" • ") || "Sans précision"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setImportDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce prospect ?</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId !== null && deleteEntry(deleteConfirmId)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

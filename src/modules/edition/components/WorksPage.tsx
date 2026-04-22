"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useEditionData } from "@/hooks/useEditionData";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Work, Person, PersonRole, SplitEntry, SacemRepartition, EditionPublisher } from "@/lib/sidekick-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Music,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSON_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];
const PERSON_COLORS_HEX = ["#3b82f6","#22c55e","#a855f7","#ec4899","#f97316","#14b8a6"];

const ALL_ROLES: { value: PersonRole; label: string }[] = [
  { value: "author", label: "Auteur" },
  { value: "composer", label: "Compositeur" },
  { value: "arranger", label: "Arrangeur" },
];

const EXPLOITATION_TYPES: { value: Work["exploitationTypes"][number]; label: string }[] = [
  { value: "streaming", label: "Streaming" },
  { value: "live", label: "Live" },
  { value: "sync", label: "Synchronisation" },
  { value: "cover", label: "Reprise/Cover" },
];

// SACEM defaults
const DEFAULT_DEP: SacemRepartition = { authors: 33.33, composers: 33.33, publishers: 33.33 };
const DEFAULT_DRM: SacemRepartition = { authors: 25, composers: 25, publishers: 50 };

// ─── SACEM DEP key computation ────────────────────────────────────────────────
// Sources: barème SACEM officiel DEP (droits d'exécution publique)

function computeDepRepartition(persons: Person[], hasPublisher: boolean): SacemRepartition {
  const hasAuthor   = persons.some((p) => p.roles.includes("author"));
  const hasComposer = persons.some((p) => p.roles.includes("composer"));
  const hasArranger = persons.some((p) => p.roles.includes("arranger"));

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Auteur seul
  if (hasAuthor && !hasComposer && !hasArranger && !hasPublisher)
    return { authors: 100, composers: 0, publishers: 0 };

  // Compositeur seul
  if (!hasAuthor && hasComposer && !hasArranger && !hasPublisher)
    return { authors: 0, composers: 100, publishers: 0 };

  // Auteur + Compositeur (pas d'arrangeur, pas d'éditeur)
  if (hasAuthor && hasComposer && !hasArranger && !hasPublisher)
    return { authors: 50, composers: 50, publishers: 0 };

  // Auteur + Éditeur (pas de compositeur)
  if (hasAuthor && !hasComposer && !hasArranger && hasPublisher)
    return { authors: round2(200/3), composers: 0, publishers: round2(100/3) };

  // Compositeur + Éditeur (pas d'auteur)
  if (!hasAuthor && hasComposer && !hasArranger && hasPublisher)
    return { authors: 0, composers: round2(200/3), publishers: round2(100/3) };

  // Auteur + Compositeur + Éditeur
  if (hasAuthor && hasComposer && !hasArranger && hasPublisher)
    return { authors: round2(100/3), composers: round2(100/3), publishers: round2(100/3) };

  // Compositeur + Arrangeur (pas d'auteur, pas d'éditeur)
  if (!hasAuthor && hasComposer && hasArranger && !hasPublisher)
    return { authors: 0, composers: round2(1100/12), publishers: round2(100/12) };
  // Note: "composers" field ici contient la part compositeur, "publishers" la part arrangeur
  // On va adapter l'affichage dans le bloc SACEM

  // Compositeur + Arrangeur + Éditeur
  if (!hasAuthor && hasComposer && hasArranger && hasPublisher)
    return { authors: 0, composers: round2(700/12), publishers: round2(400/12) };
  // arrangeur = 100/12

  // Auteur + Compositeur + Arrangeur
  if (hasAuthor && hasComposer && hasArranger && !hasPublisher)
    return { authors: round2(1100/24), composers: round2(1100/24), publishers: 0 };
  // arrangeur = 200/24

  // Auteur + Compositeur + Arrangeur + Éditeur
  if (hasAuthor && hasComposer && hasArranger && hasPublisher)
    return { authors: round2(700/24), composers: round2(700/24), publishers: round2(800/24) };
  // arrangeur = 200/24

  // Fallback : égalité
  const cats = [hasAuthor, hasComposer, hasPublisher].filter(Boolean).length;
  const pct = cats > 0 ? round2(100 / cats) : 0;
  return {
    authors: hasAuthor ? pct : 0,
    composers: hasComposer ? pct : 0,
    publishers: hasPublisher ? pct : 0,
  };
}

// Arranger share within DEP (always 8.33% when present)
function getArrangerDepShare(persons: Person[]): number | null {
  return persons.some((p) => p.roles.includes("arranger")) ? Math.round(100/12 * 100) / 100 : null;
}

// ─── SACEM DRM key computation ────────────────────────────────────────────────

function computeDrmRepartition(persons: Person[], hasPublisher: boolean): SacemRepartition {
  const hasAuthor   = persons.some((p) => p.roles.includes("author"));
  const hasComposer = persons.some((p) => p.roles.includes("composer"));
  const hasArranger = persons.some((p) => p.roles.includes("arranger"));

  // Auteur seul
  if (hasAuthor && !hasComposer && !hasArranger && !hasPublisher)
    return { authors: 100, composers: 0, publishers: 0 };

  // Compositeur seul
  if (!hasAuthor && hasComposer && !hasArranger && !hasPublisher)
    return { authors: 0, composers: 100, publishers: 0 };

  // Auteur + Compositeur
  if (hasAuthor && hasComposer && !hasArranger && !hasPublisher)
    return { authors: 50, composers: 50, publishers: 0 };

  // Auteur + Éditeur
  if (hasAuthor && !hasComposer && !hasArranger && hasPublisher)
    return { authors: 50, composers: 0, publishers: 50 };

  // Compositeur + Éditeur
  if (!hasAuthor && hasComposer && !hasArranger && hasPublisher)
    return { authors: 0, composers: 50, publishers: 50 };

  // Auteur + Compositeur + Éditeur
  if (hasAuthor && hasComposer && !hasArranger && hasPublisher)
    return { authors: 25, composers: 25, publishers: 50 };

  // Compositeur + Arrangeur (pas d'auteur, pas d'éditeur)
  if (!hasAuthor && hasComposer && hasArranger && !hasPublisher)
    return { authors: 0, composers: 93.75, publishers: 6.25 };

  // Compositeur + Arrangeur + Éditeur
  if (!hasAuthor && hasComposer && hasArranger && hasPublisher)
    return { authors: 0, composers: 43.75, publishers: 50 };
  // arrangeur = 6.25

  // Auteur + Compositeur + Arrangeur
  if (hasAuthor && hasComposer && hasArranger && !hasPublisher)
    return { authors: 46.875, composers: 46.875, publishers: 0 };
  // arrangeur = 6.25

  // Auteur + Compositeur + Arrangeur + Éditeur
  if (hasAuthor && hasComposer && hasArranger && hasPublisher)
    return { authors: 15.625, composers: 15.625, publishers: 50 };
  // arrangeur = 6.25 (reste = 100 - 15.625 - 15.625 - 50 - 6.25... -> publishers inclut éditeur, arrangeur séparé)

  // Fallback
  const cats = [hasAuthor, hasComposer, hasPublisher].filter(Boolean).length;
  const pct = cats > 0 ? Math.round((100 / cats) * 100) / 100 : 0;
  return { authors: hasAuthor ? pct : 0, composers: hasComposer ? pct : 0, publishers: hasPublisher ? pct : 0 };
}

// Arranger share within DRM (always 6.25% when present)
function getArrangerDrmShare(persons: Person[]): number | null {
  return persons.some((p) => p.roles.includes("arranger")) ? 6.25 : null;
}

const DEFAULT_WORK: Omit<Work, "id"> = {
  artistName: "",
  title: "",
  status: "in-progress",
  persons: [],
  depRepartition: DEFAULT_DEP,
  drmRepartition: DEFAULT_DRM,
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleLabel(role: PersonRole) {
  return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
}

function getPersonDisplayName(p: Person) {
  const full = [p.firstName, p.name].filter(Boolean).join(" ");
  return p.pseudonym ? `${full} (${p.pseudonym})` : full || "—";
}

function sumSplits(entries: SplitEntry[]) {
  return Math.round(entries.reduce((s, e) => s + e.pct, 0) * 100) / 100;
}

const STATUS_STEPS: { value: Work["status"]; label: string; color: string; dot: string }[] = [
  { value: "in-progress",      label: "En cours",  color: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "finalized",        label: "Finalisée", color: "text-blue-400",   dot: "bg-blue-400" },
  { value: "registered-sacem", label: "Déposée",   color: "text-purple-400", dot: "bg-purple-400" },
  { value: "accepted-sacem",   label: "Acceptée",  color: "text-green-400",  dot: "bg-green-400" },
];

function StatusTimeline({
  status,
  onChange,
}: {
  status: Work["status"];
  onChange?: (s: Work["status"]) => void;
}) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.value === status);
  const interactive = !!onChange;
  const current = STATUS_STEPS[currentIdx];
  return (
    <div className="space-y-1.5">
      {/* Barre de progression */}
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isPast = i < currentIdx;
          return (
            <div key={step.value} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-10 transition-colors",
                    isPast ? "bg-[rgba(245,245,245,0.35)]" : isActive ? "bg-[rgba(245,245,245,0.15)]" : "bg-[rgba(245,245,245,0.08)]"
                  )}
                />
              )}
              <button
                type="button"
                title={step.label}
                disabled={!interactive}
                onClick={() => onChange?.(step.value)}
                className={cn("group relative flex items-center justify-center", interactive ? "cursor-pointer" : "cursor-default")}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full transition-all duration-200",
                    isActive
                      ? `${step.dot} ring-2 ring-offset-2 ring-offset-[#1a1a1a] scale-110`
                      : isPast
                      ? "bg-[rgba(245,245,245,0.4)]"
                      : "bg-[rgba(245,245,245,0.12)]",
                    interactive && !isActive && "group-hover:bg-[rgba(245,245,245,0.3)]"
                  )}
                  style={undefined}
                />
              </button>
            </div>
          );
        })}
      </div>
      {/* Label du statut actif */}
      <p className={cn("text-xs font-medium", current?.color ?? "text-[#F5F5F5]/40")}>
        {current?.label ?? "—"}
      </p>
    </div>
  );
}

function getExploitationLabel(type: Work["exploitationTypes"][number]) {
  switch (type) {
    case "streaming": return "Streaming";
    case "live": return "Live";
    case "sync": return "Synchronisation";
    case "cover": return "Reprise/Cover";
  }
}

// ─── RightsPieCharts (DEP + DRM) ──────────────────────────────────────────────

type PieSegment = { key: string; label: string; pct: number; colorHex: string };

/** Compute SVG donut path for a single segment given cumulative start angle (degrees). */
function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
}

function PieChart({ segments, size = 56 }: { segments: PieSegment[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 2, hole = r * 0.52;
  const total = segments.reduce((s, seg) => s + seg.pct, 0);

  if (segments.length === 0 || total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="rgba(245,245,245,0.06)" />
        <circle cx={cx} cy={cy} r={hole} fill="#101010" />
      </svg>
    );
  }

  // Single segment = full circle
  if (segments.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill={segments[0].colorHex} opacity={0.9} />
        <circle cx={cx} cy={cy} r={hole} fill="#101010" />
      </svg>
    );
  }

  let cursor = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg) => {
        const sweep = (seg.pct / total) * 360;
        const path = pieSlicePath(cx, cy, r, cursor, cursor + sweep);
        cursor += sweep;
        return <path key={seg.key} d={path} fill={seg.colorHex} opacity={0.9} />;
      })}
      <circle cx={cx} cy={cy} r={hole} fill="#101010" />
    </svg>
  );
}

function buildSegments(
  work: Omit<Work, "id">,
  repartition: SacemRepartition,
): PieSegment[] {
  const { persons, splitsAuthors, splitsComposers, selfPublished, externalPublishers } = work;
  const isSolo = persons.length <= 1 && selfPublished;

  if (isSolo) {
    const name = persons[0] ? getPersonDisplayName(persons[0]) : "Artiste";
    return [{ key: "__solo__", label: name, pct: 100, colorHex: "#F0FF00" }];
  }

  const map = new Map<string, PieSegment>();
  let colorIdx = 0;

  const addEntries = (entries: SplitEntry[], catShare: number) => {
    entries.forEach((e) => {
      const abs = (e.pct / 100) * catShare;
      const existing = map.get(e.personId);
      if (existing) {
        existing.pct += abs;
      } else {
        const person = persons.find((p) => p.id === e.personId);
        map.set(e.personId, {
          key: e.personId,
          label: person ? getPersonDisplayName(person) : "—",
          pct: abs,
          colorHex: PERSON_COLORS_HEX[colorIdx++ % PERSON_COLORS_HEX.length],
        });
      }
    });
  };

  addEntries(splitsAuthors, repartition.authors);
  addEntries(splitsComposers, repartition.composers);

  if (selfPublished) {
    map.set("__self__", { key: "__self__", label: "Auto-édition", pct: repartition.publishers, colorHex: "#eab308" });
  } else {
    externalPublishers.forEach((pub) => {
      const abs = (pub.pct / 100) * repartition.publishers;
      map.set(pub.id, { key: pub.id, label: pub.name || "Éditeur", pct: abs, colorHex: "#eab308" });
    });
  }

  return Array.from(map.values()).filter((s) => s.pct > 0);
}

function RightsPieCharts({ work }: { work: Omit<Work, "id"> }) {
  const depSegments = buildSegments(work, work.depRepartition);
  const drmSegments = buildSegments(work, work.drmRepartition);

  // Build legend: all keys, with their pct in DEP and DRM
  const allKeys = Array.from(new Set([...depSegments.map((s) => s.key), ...drmSegments.map((s) => s.key)]));
  const legend = allKeys.map((key) => {
    const dep = depSegments.find((s) => s.key === key);
    const drm = drmSegments.find((s) => s.key === key);
    const seg = dep ?? drm!;
    return {
      key,
      label: seg.label,
      colorHex: seg.colorHex,
      depPct: dep ? Math.round(dep.pct * 10) / 10 : 0,
      drmPct: drm ? Math.round(drm.pct * 10) / 10 : 0,
    };
  });

  return (
    <div className="rounded-b-xl border-t border-[rgba(245,245,245,0.07)] bg-[rgba(0,0,0,0.15)] px-4 py-3 space-y-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-[#F5F5F5]/35">Répartition des droits</p>
      <div className="grid grid-cols-2 gap-2">
        {/* DEP */}
        <div className="flex items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
          <PieChart segments={depSegments} size={56} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80">DEP</p>
            <p className="text-[10px] text-[#F5F5F5]/55 leading-snug">Droits d&apos;exécution publique</p>
          </div>
        </div>
        {/* DRM */}
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <PieChart segments={drmSegments} size={56} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">DRM</p>
            <p className="text-[10px] text-[#F5F5F5]/55 leading-snug">Droits de reproduction mécanique</p>
          </div>
        </div>
      </div>
      {/* Légende avec % DEP / DRM */}
      <div className="flex flex-col gap-1 pt-0.5">
        {legend.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.colorHex }} />
            <span className="text-[10px] text-[#F5F5F5]/60">
              {s.label}
              <span className="ml-1.5 text-[#F5F5F5]/35">—</span>
              <span className="ml-1.5 text-indigo-400/70">DEP : {s.depPct}%</span>
              <span className="mx-1 text-[#F5F5F5]/25">/</span>
              <span className="text-amber-400/70">DRM : {s.drmPct}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SplitCategoryEditor ───────────────────────────────────────────────────────

interface SplitCategoryEditorProps {
  label: string;
  accentClass: string;
  eligiblePersons: Person[];
  entries: SplitEntry[];
  onChange: (entries: SplitEntry[]) => void;
  disabled?: boolean;
  disabledReason?: string;
}

function SplitCategoryEditor({
  label, accentClass, eligiblePersons, entries, onChange, disabled, disabledReason,
}: SplitCategoryEditorProps) {
  // Always show all eligible persons; pct defaults to 0 if not in entries
  const getPct = (personId: string) => entries.find((e) => e.personId === personId)?.pct ?? 0;

  const updatePct = (personId: string, pct: number) => {
    const existing = entries.find((e) => e.personId === personId);
    if (existing) {
      onChange(entries.map((e) => e.personId === personId ? { ...e, pct } : e));
    } else {
      onChange([...entries, { personId, pct }]);
    }
  };

  // Build effective entries for all eligible persons
  const effectiveEntries = eligiblePersons.map((p) => ({ personId: p.id, pct: getPct(p.id) }));
  const total = sumSplits(effectiveEntries);
  const isValid = Math.round(total) === 100;

  return (
    <div className={cn("rounded-lg border-l-2 bg-[rgba(245,245,245,0.04)] p-3 space-y-2", accentClass)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#F5F5F5]/60">{label}</p>

      {disabled ? (
        <p className="text-xs text-[#F5F5F5]/40 italic">{disabledReason}</p>
      ) : eligiblePersons.length === 0 ? (
        <p className="text-xs text-[#F5F5F5]/40 italic">
          Aucune personne avec ce rôle.
        </p>
      ) : (
        <>
          {eligiblePersons.map((person) => (
            <div key={person.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs">{getPersonDisplayName(person)}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={getPct(person.id) === 0 ? "" : getPct(person.id)}
                  onChange={(e) => updatePct(person.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-7 w-16 text-xs"
                />
                <span className="text-xs text-[#F5F5F5]/50">%</span>
              </div>
            </div>
          ))}

          <div className={cn("flex items-center gap-1 text-xs font-medium pt-1", isValid ? "text-green-400" : "text-red-400")}>
            {isValid
              ? <><CheckCircle2 className="h-3 w-3" /> 100%</>
              : <><AlertCircle className="h-3 w-3" /> {total}% {total < 100 ? `(manque ${Math.round(100 - total)}%)` : `(excès ${Math.round(total - 100)}%)`}</>
            }
          </div>
        </>
      )}
    </div>
  );
}

// ─── WorkForm ─────────────────────────────────────────────────────────────────

interface WorkFormProps {
  work: Omit<Work, "id">;
  setWork: React.Dispatch<React.SetStateAction<Omit<Work, "id">>>;
}

const WorkForm = memo(function WorkForm({ work, setWork }: WorkFormProps) {
  const [newFirstName, setNewFirstName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPseudonym, setNewPseudonym] = useState("");
  const [newRoles, setNewRoles] = useState<PersonRole[]>([]);
  const [newPubName, setNewPubName] = useState("");
  const [newPubCoad, setNewPubCoad] = useState("");
  const [newPubPct, setNewPubPct] = useState("");
  const [territory, setTerritory] = useState("");
  const [soloArtist, setSoloArtist] = useState(() => work.persons.length <= 1);
  const [splitMode, setSplitMode] = useState<"equitable" | "custom">("equitable");

  const isSoloMode = soloArtist;

  // Recalcule les clés DEP + DRM dès que les personnes ou l'éditeur changent
  useEffect(() => {
    const hasPublisher = !work.selfPublished && work.externalPublishers.length > 0;
    const dep = computeDepRepartition(work.persons, hasPublisher);
    const drm = computeDrmRepartition(work.persons, hasPublisher);
    setWork((prev) => ({ ...prev, depRepartition: dep, drmRepartition: drm }));
  }, [work.persons, work.selfPublished, work.externalPublishers]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNewRole = (role: PersonRole) => {
    setNewRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  };

  const addPerson = useCallback(() => {
    if (!newName.trim() || (!isSoloMode && newRoles.length === 0)) return;
    const person: Person = {
      id: crypto.randomUUID(),
      firstName: newFirstName.trim(),
      name: newName.trim(),
      pseudonym: newPseudonym.trim(),
      roles: isSoloMode ? ["author", "composer"] : newRoles,
    };
    setWork((prev) => ({ ...prev, persons: [...prev.persons, person] }));
    setNewFirstName("");
    setNewName("");
    setNewPseudonym("");
    setNewRoles([]);
  }, [newFirstName, newName, newPseudonym, newRoles, isSoloMode, setWork]);

  const updatePerson = useCallback((id: string, field: keyof Person, value: unknown) => {
    setWork((prev) => ({
      ...prev,
      persons: prev.persons.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }, [setWork]);

  const togglePersonRole = useCallback((personId: string, role: PersonRole) => {
    setWork((prev) => ({
      ...prev,
      persons: prev.persons.map((p) => {
        if (p.id !== personId) return p;
        const roles = p.roles.includes(role) ? p.roles.filter((r) => r !== role) : [...p.roles, role];
        return { ...p, roles };
      }),
    }));
  }, [setWork]);

  const removePerson = useCallback((id: string) => {
    setWork((prev) => ({
      ...prev,
      persons: prev.persons.filter((p) => p.id !== id),
      splitsAuthors: prev.splitsAuthors.filter((e) => e.personId !== id),
      splitsComposers: prev.splitsComposers.filter((e) => e.personId !== id),
    }));
  }, [setWork]);

  const addPublisher = useCallback(() => {
    if (!newPubName.trim()) return;
    const pct = parseFloat(newPubPct) || 0;
    const pub: EditionPublisher = { id: crypto.randomUUID(), name: newPubName.trim(), coad: newPubCoad.trim(), pct };
    setWork((prev) => ({ ...prev, externalPublishers: [...prev.externalPublishers, pub] }));
    setNewPubName("");
    setNewPubCoad("");
    setNewPubPct("");
  }, [newPubName, newPubCoad, newPubPct, setWork]);

  const updatePublisher = useCallback((id: string, field: keyof EditionPublisher, value: string | number) => {
    setWork((prev) => ({
      ...prev,
      externalPublishers: prev.externalPublishers.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }, [setWork]);

  const removePublisher = useCallback((id: string) => {
    setWork((prev) => ({ ...prev, externalPublishers: prev.externalPublishers.filter((p) => p.id !== id) }));
  }, [setWork]);

  const addTerritory = useCallback(() => {
    if (!territory.trim()) return;
    setWork((prev) => ({ ...prev, territories: [...prev.territories, territory.trim()] }));
    setTerritory("");
  }, [territory, setWork]);

  const removeTerritory = useCallback((t: string) => {
    setWork((prev) => ({ ...prev, territories: prev.territories.filter((x) => x !== t) }));
  }, [setWork]);

  const toggleExploitation = useCallback((type: Work["exploitationTypes"][number]) => {
    setWork((prev) => ({
      ...prev,
      exploitationTypes: prev.exploitationTypes.includes(type)
        ? prev.exploitationTypes.filter((t) => t !== type)
        : [...prev.exploitationTypes, type],
    }));
  }, [setWork]);

  const handleSelfPublished = useCallback((checked: boolean) => {
    setWork((prev) => ({ ...prev, selfPublished: checked, externalPublishers: checked ? [] : prev.externalPublishers }));
  }, [setWork]);

  const authors = work.persons.filter((p) => p.roles.includes("author"));
  const composers = work.persons.filter((p) => p.roles.includes("composer") || p.roles.includes("arranger"));
  const authorsOk = authors.length === 0 || sumSplits(work.splitsAuthors) === 100;
  const composersOk = composers.length === 0 || sumSplits(work.splitsComposers) === 100;
  const pubTotal = sumSplits(work.externalPublishers.map((p) => ({ personId: p.id, pct: p.pct })));
  const publishersOk = work.selfPublished || work.externalPublishers.length === 0 || pubTotal === 100;

  return (
    <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">

      {/* ── Case rapide : artiste solo ── */}
      <div className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        soloArtist ? "border-[#F0FF00]/30 bg-[#F0FF00]/5" : "border-[rgba(245,245,245,0.12)]"
      )}>
        <Checkbox
          id="solo-mode"
          checked={soloArtist}
          onCheckedChange={(v) => {
            setSoloArtist(!!v);
            if (v) {
              // entrer en mode solo : forcer auto-édité
              setWork((prev) => ({ ...prev, selfPublished: true, externalPublishers: [] }));
            } else {
              // quitter le mode solo : vider la personne auto-créée si vide
              setWork((prev) => ({
                ...prev,
                persons: prev.persons.filter((p) => p.name.trim() || p.firstName.trim()),
                splitsAuthors: [],
                splitsComposers: [],
              }));
            }
          }}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="solo-mode" className="cursor-pointer font-medium">
            Je suis le seul Auteur-Compositeur sur cette œuvre et auto-édité
          </Label>
          <p className="mt-0.5 text-xs text-[#F5F5F5]/50">
            Il suffit de renseigner mon nom et pseudonyme.
          </p>
        </div>
      </div>

      {/* Artiste + Titre */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nom du groupe / de l&apos;artiste *</Label>
          <Input
            value={work.artistName}
            onChange={(e) => setWork((p) => ({ ...p, artistName: e.target.value }))}
            placeholder="Nom..."
          />
        </div>
        <div className="space-y-1">
          <Label>Titre de l&apos;œuvre *</Label>
          <Input
            value={work.title}
            onChange={(e) => setWork((p) => ({ ...p, title: e.target.value }))}
            placeholder="Titre..."
          />
        </div>
      </div>

      {/* Statut */}
      <div className="space-y-2">
        <Label>Statut</Label>
        <div className="rounded-lg border border-[rgba(245,245,245,0.12)] bg-[rgba(15,23,42,0.88)] px-4 py-3">
          <StatusTimeline status={work.status} onChange={(s) => setWork((p) => ({ ...p, status: s }))} />
        </div>
      </div>

      {/* ── Personnes impliquées ── */}
      <div className="space-y-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-4">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <Label>{isSoloMode ? "Auteur-Compositeur" : "Personnes impliquées *"}</Label>
        </div>

        {/* Add form */}
        {isSoloMode ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-[#F5F5F5]/60">Prénom</Label>
              <Input
                value={work.persons[0]?.firstName ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setWork((prev) => {
                    if (prev.persons.length === 0) {
                      return { ...prev, persons: [{ id: crypto.randomUUID(), firstName: val, name: "", pseudonym: "", roles: ["author", "composer"] }] };
                    }
                    return { ...prev, persons: prev.persons.map((p, i) => i === 0 ? { ...p, firstName: val } : p) };
                  });
                }}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#F5F5F5]/60">Nom</Label>
              <Input
                value={work.persons[0]?.name ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setWork((prev) => {
                    if (prev.persons.length === 0) {
                      return { ...prev, persons: [{ id: crypto.randomUUID(), firstName: "", name: val, pseudonym: "", roles: ["author", "composer"] }] };
                    }
                    return { ...prev, persons: prev.persons.map((p, i) => i === 0 ? { ...p, name: val } : p) };
                  });
                }}
                placeholder="Nom"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#F5F5F5]/60">Pseudonyme</Label>
              <Input
                value={work.persons[0]?.pseudonym ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setWork((prev) => {
                    if (prev.persons.length === 0) {
                      return { ...prev, persons: [{ id: crypto.randomUUID(), firstName: "", name: "", pseudonym: val, roles: ["author", "composer"] }] };
                    }
                    return { ...prev, persons: prev.persons.map((p, i) => i === 0 ? { ...p, pseudonym: val } : p) };
                  });
                }}
                placeholder="Pseudo"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-[rgba(245,245,245,0.1)] p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#F5F5F5]/60">Prénom</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Prénom" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#F5F5F5]/60">Nom *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPerson())}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#F5F5F5]/60">Pseudonyme</Label>
                <Input value={newPseudonym} onChange={(e) => setNewPseudonym(e.target.value)} placeholder="Pseudo" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[#F5F5F5]/60">Rôles *</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleNewRole(value)}
                    className={cn(
                      "rounded-full px-3 py-0.5 text-xs transition-colors",
                      newRoles.includes(value)
                        ? "bg-indigo-600 text-white"
                        : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.15)]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={addPerson}
              disabled={!newName.trim() || newRoles.length === 0}
            >
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        )}

        {/* Person list — masquée en mode solo (les champs directs suffisent) */}
        {!isSoloMode && work.persons.length > 0 && (
          <div className="space-y-2">
            {work.persons.map((person, i) => (
              <div key={person.id} className="space-y-2 rounded-md bg-[rgba(245,245,245,0.06)] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", PERSON_COLORS[i % PERSON_COLORS.length])} />
                    <span className="text-xs font-medium text-[#F5F5F5]/80">{getPersonDisplayName(person)}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePerson(person.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/50">Prénom</Label>
                    <Input value={person.firstName} onChange={(e) => updatePerson(person.id, "firstName", e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/50">Nom</Label>
                    <Input value={person.name} onChange={(e) => updatePerson(person.id, "name", e.target.value)} placeholder="Nom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/50">Pseudonyme</Label>
                    <Input value={person.pseudonym} onChange={(e) => updatePerson(person.id, "pseudonym", e.target.value)} placeholder="Pseudo" />
                  </div>
                </div>
                {/* Rôles — masqués en mode solo */}
                {!(isSoloMode) && (
                  <div className="space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/50">Rôles</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ROLES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => togglePersonRole(person.id, value)}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                            person.roles.includes(value)
                              ? "bg-indigo-600 text-white"
                              : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/60 hover:bg-[rgba(245,245,245,0.15)]"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Éditeurs — masqués en mode solo ── */}
      {!isSoloMode && <div className="space-y-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-4">
          <Label>Édition</Label>

          {/* Toggle éditeur présent */}
          <div className={cn(
            "flex items-center gap-3 rounded-lg border p-3 transition-colors",
            !work.selfPublished
              ? "border-indigo-500/30 bg-indigo-500/10"
              : "border-[rgba(245,245,245,0.12)]"
          )}>
            <Checkbox
              id="has-publisher"
              checked={!work.selfPublished}
              onCheckedChange={(v) => {
                setWork((prev) => ({
                  ...prev,
                  selfPublished: !v,
                  externalPublishers: v ? prev.externalPublishers : [],
                }));
              }}
            />
            <Label htmlFor="has-publisher" className="cursor-pointer text-sm">
              Éditeur présent sur cette œuvre
            </Label>
          </div>

          {/* Éditeurs externes si éditeur présent */}
          {!work.selfPublished && (
            <div className="space-y-3">
              {/* Add publisher */}
              <div className="space-y-2 rounded-md border border-[rgba(245,245,245,0.1)] p-3">
                <p className="text-xs text-[#F5F5F5]/50">Ajouter un éditeur</p>
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-7 space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/60">Nom *</Label>
                    <Input value={newPubName} onChange={(e) => setNewPubName(e.target.value)} placeholder="Nom de la société" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs text-[#F5F5F5]/60">Code international / COAD</Label>
                    <Input value={newPubCoad} onChange={(e) => setNewPubCoad(e.target.value)} placeholder="FR-XXXXXX" />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" size="sm" onClick={addPublisher} disabled={!newPubName.trim()} className="w-full">
                      <Plus className="mr-1 h-4 w-4" /> Ajouter
                    </Button>
                  </div>
                </div>
              </div>

              {/* Publisher list (nom + COAD + supprimer, sans %) */}
              {work.externalPublishers.length > 0 && (
                <div className="space-y-2">
                  {work.externalPublishers.map((pub) => (
                    <div key={pub.id} className="grid grid-cols-12 items-center gap-2 rounded-md bg-yellow-500/5 p-3">
                      <div className="col-span-7 space-y-1">
                        <Label className="text-xs text-[#F5F5F5]/50">Nom</Label>
                        <Input value={pub.name} onChange={(e) => updatePublisher(pub.id, "name", e.target.value)} placeholder="Nom" />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-[#F5F5F5]/50">Code international / COAD</Label>
                        <Input value={pub.coad} onChange={(e) => updatePublisher(pub.id, "coad", e.target.value)} placeholder="FR-XXXXXX" />
                      </div>
                      <div className="col-span-2 flex items-end justify-end pb-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePublisher(pub.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}

      {/* ── Clés SACEM DEP + DRM — masquées en mode solo ── */}
      {!(isSoloMode) && work.persons.length > 0 && (() => {
        const hasPublisher = !work.selfPublished && work.externalPublishers.length > 0;
        const dep = computeDepRepartition(work.persons, hasPublisher);
        const drm = computeDrmRepartition(work.persons, hasPublisher);
        const depArr = getArrangerDepShare(work.persons);
        const drmArr = getArrangerDrmShare(work.persons);
        const hasAuthor   = work.persons.some((p) => p.roles.includes("author"));
        const hasComposer = work.persons.some((p) => p.roles.includes("composer"));
        const hasArranger = work.persons.some((p) => p.roles.includes("arranger"));

        type Col = { label: string; depPct: number; drmPct: number };
        const rows: Col[] = [];
        if (hasAuthor)   rows.push({ label: "Auteurs",      depPct: dep.authors,   drmPct: drm.authors });
        if (hasComposer) rows.push({ label: "Compositeurs", depPct: depArr != null ? dep.composers - depArr : dep.composers, drmPct: drmArr != null ? drm.composers - drmArr : drm.composers });
        if (hasArranger) rows.push({ label: "Arrangeurs",   depPct: depArr ?? 0,   drmPct: drmArr ?? 0 });
        if (hasPublisher) rows.push({ label: "Éditeurs",    depPct: dep.publishers, drmPct: drm.publishers });

        const fmt = (n: number) => n === 0 ? "—" : `${parseFloat(n.toFixed(3))}%`;

        return (
          <div className="rounded-lg border border-[rgba(245,245,245,0.1)] p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-[#F5F5F5]/40" />
              <p className="text-xs font-semibold text-[#F5F5F5]/60">Clés de répartition SACEM</p>
              <Badge variant="outline" className="text-xs text-[#F5F5F5]/40">Non modifiables</Badge>
            </div>
            <p className="text-[10px] text-[#F5F5F5]/40 italic">
              Calculées automatiquement selon le barème SACEM en fonction des rôles et de la présence d&apos;un éditeur.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* DEP */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400/70">DEP</p>
                <div className="space-y-1">
                  {rows.map((r) => (
                    <div key={r.label} className="flex justify-between text-xs">
                      <span className="text-[#F5F5F5]/55">{r.label}</span>
                      <span className="tabular-nums font-medium text-[#F5F5F5]/80">{fmt(r.depPct)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* DRM */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">DRM</p>
                <div className="space-y-1">
                  {rows.map((r) => (
                    <div key={r.label} className="flex justify-between text-xs">
                      <span className="text-[#F5F5F5]/55">{r.label}</span>
                      <span className="tabular-nums font-medium text-[#F5F5F5]/80">{fmt(r.drmPct)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Distribution interne — masquée en mode solo ── */}
      {!(isSoloMode) && work.persons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label>Distribution interne par catégorie</Label>
            {/* Équitable / Personnalisé toggle */}
            <div className="flex items-center rounded-lg border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.04)] p-0.5">
              {(["equitable", "custom"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setSplitMode(mode);
                    if (mode === "custom") {
                      setWork((prev) => {
                        const authPersons = prev.persons.filter((p) => p.roles.includes("author"));
                        const compPersons = prev.persons.filter((p) => p.roles.includes("composer") || p.roles.includes("arranger"));
                        const pubList = prev.selfPublished ? [] : prev.externalPublishers;
                        const eqAuthPct = authPersons.length > 0 ? Math.round(100 / authPersons.length) : 0;
                        const eqCompPct = compPersons.length > 0 ? Math.round(100 / compPersons.length) : 0;
                        const eqPubPct  = pubList.length > 0 ? Math.round(100 / pubList.length) : 0;
                        return {
                          ...prev,
                          splitsAuthors: authPersons.map((p, i) => ({
                            personId: p.id,
                            pct: i === authPersons.length - 1
                              ? 100 - eqAuthPct * (authPersons.length - 1)
                              : eqAuthPct,
                          })),
                          splitsComposers: compPersons.map((p, i) => ({
                            personId: p.id,
                            pct: i === compPersons.length - 1
                              ? 100 - eqCompPct * (compPersons.length - 1)
                              : eqCompPct,
                          })),
                          externalPublishers: pubList.map((pub, i) => ({
                            ...pub,
                            pct: i === pubList.length - 1
                              ? 100 - eqPubPct * (pubList.length - 1)
                              : eqPubPct,
                          })),
                        };
                      });
                    }
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    splitMode === mode
                      ? "bg-[rgba(245,245,245,0.15)] text-[#F5F5F5]"
                      : "text-[#F5F5F5]/50 hover:text-[#F5F5F5]/80"
                  )}
                >
                  {mode === "equitable" ? "Équitable" : "Personnalisé"}
                </button>
              ))}
            </div>
          </div>
          {splitMode === "equitable" ? (
            <div className="rounded-lg border border-[rgba(245,245,245,0.1)] bg-[rgba(245,245,245,0.04)] p-3">
              <p className="text-xs text-[#F5F5F5]/60">
                La répartition est automatiquement divisée à parts égales entre toutes les personnes de chaque catégorie.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <SplitCategoryEditor
                label={`Auteurs & Adaptateurs — DEP ${work.depRepartition.authors}% / DRM ${work.drmRepartition.authors}%`}
                accentClass="border-indigo-500/60"
                eligiblePersons={authors}
                entries={work.splitsAuthors}
                onChange={(entries) => setWork((p) => ({ ...p, splitsAuthors: entries }))}
              />
              <SplitCategoryEditor
                label={`Compositeurs & Arrangeurs — DEP ${work.depRepartition.composers}% / DRM ${work.drmRepartition.composers}%`}
                accentClass="border-purple-500/60"
                eligiblePersons={composers}
                entries={work.splitsComposers}
                onChange={(entries) => setWork((p) => ({ ...p, splitsComposers: entries }))}
              />
              {/* Éditeurs — seulement si éditeur présent */}
              {!work.selfPublished && work.externalPublishers.length > 0 && (
                <div className="rounded-lg border-l-2 border-yellow-500/60 bg-[rgba(245,245,245,0.04)] p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F5F5F5]/60">
                    Éditeurs — DEP {work.depRepartition.publishers}% / DRM {work.drmRepartition.publishers}%
                  </p>
                  {work.externalPublishers.map((pub) => (
                    <div key={pub.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs">{pub.name || "Éditeur"}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={pub.pct === 0 ? "" : pub.pct}
                          onChange={(e) => updatePublisher(pub.id, "pct", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-7 w-16 text-xs"
                        />
                        <span className="text-xs text-[#F5F5F5]/50">%</span>
                      </div>
                    </div>
                  ))}
                  <div className={cn("flex items-center gap-1 text-xs font-medium pt-1", pubTotal === 100 ? "text-green-400" : "text-red-400")}>
                    {pubTotal === 100
                      ? <><CheckCircle2 className="h-3 w-3" /> 100%</>
                      : <><AlertCircle className="h-3 w-3" /> {pubTotal}% {pubTotal < 100 ? `(manque ${Math.round(100 - pubTotal)}%)` : `(excès ${Math.round(pubTotal - 100)}%)`}</>
                    }
                  </div>
                </div>
              )}
              {(!authorsOk || !composersOk || !publishersOk) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {!authorsOk && "Le total Auteurs doit être 100%. "}
                    {!composersOk && "Le total Compositeurs doit être 100%. "}
                    {!publishersOk && "Le total Éditeurs doit être 100%."}
                  </span>
                </div>
              )}
              {authorsOk && composersOk && publishersOk && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Répartition complète et valide.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Métadonnées ── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>ISWC</Label>
          <Input value={work.iswc} onChange={(e) => setWork((p) => ({ ...p, iswc: e.target.value }))} placeholder="T-123.456.789-0" />
        </div>
        <div className="space-y-1">
          <Label>Date de 1ère exploitation</Label>
          <DatePicker value={work.firstExploitationDate} onChange={(d) => setWork((p) => ({ ...p, firstExploitationDate: d }))} />
        </div>
        <div className="space-y-1">
          <Label>Genre</Label>
          <Input value={work.genre} onChange={(e) => setWork((p) => ({ ...p, genre: e.target.value }))} placeholder="Pop, Jazz..." />
        </div>
        <div className="space-y-1">
          <Label>Durée</Label>
          <Input value={work.duration} onChange={(e) => setWork((p) => ({ ...p, duration: e.target.value }))} placeholder="3:42" />
        </div>
      </div>

      {/* Fichiers */}
      <div>
        <Label className="mb-2 block">Fichiers</Label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "sheet" as const, label: "Partition", Icon: FileText },
            { key: "lyrics" as const, label: "Paroles", Icon: FileText },
            { key: "audio" as const, label: "Audio", Icon: Music },
          ] as const).map(({ key, label, Icon }) => (
            <div key={key} className="space-y-2 rounded-lg border border-[rgba(245,245,245,0.12)] p-3 text-center">
              <Icon className="mx-auto h-5 w-5 text-[#F5F5F5]/50" />
              <p className="text-xs font-medium">{label}</p>
              <p className="truncate text-xs text-[#F5F5F5]/50">{work.files[key] ?? "Aucun fichier"}</p>
              <Button type="button" variant="outline" size="xs" className="w-full">
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Types d'exploitation */}
      <div>
        <Label className="mb-2 block">Types d&apos;exploitation</Label>
        <div className="grid grid-cols-2 gap-2">
          {EXPLOITATION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleExploitation(value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                work.exploitationTypes.includes(value)
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-[rgba(245,245,245,0.12)] hover:border-[rgba(245,245,245,0.3)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Premier diffuseur */}
      <div className="space-y-1">
        <Label>Premier diffuseur ou exploitant</Label>
        <Input
          value={work.firstBroadcaster}
          onChange={(e) => setWork((p) => ({ ...p, firstBroadcaster: e.target.value }))}
          placeholder="Ex. Spotify, Canal+, label, salle..."
        />
      </div>

      {/* Territoires */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <Label>Territoires</Label>
          <button
            type="button"
            onClick={() => setWork((p) => ({ ...p, worldwideRights: !p.worldwideRights, territories: [] }))}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              work.worldwideRights
                ? "border-[#F0FF00]/30 bg-[#F0FF00]/10 text-[#F0FF00]"
                : "border-[rgba(245,245,245,0.15)] text-[#F5F5F5]/50 hover:border-[rgba(245,245,245,0.3)]"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", work.worldwideRights ? "bg-[#F0FF00]" : "bg-[rgba(245,245,245,0.3)]")} />
            Monde entier
          </button>
        </div>
        {!work.worldwideRights && (
          <>
            <div className="flex gap-2">
              <Input
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="Ajouter un territoire..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTerritory())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTerritory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {work.territories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {work.territories.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTerritory(t)} className="ml-0.5 hover:text-red-400">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea rows={3} value={work.notes} onChange={(e) => setWork((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes sur l'œuvre..." />
      </div>
    </div>
  );
});

// ─── WorksPage ─────────────────────────────────────────────────────────────────

export function WorksPage() {
  const { works, setWorks, loading, error } = useEditionData();
  const { data, setData } = useSidekickData();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [newWork, setNewWork] = useState<Omit<Work, "id">>(DEFAULT_WORK);
  const [editWork, setEditWork] = useState<Omit<Work, "id">>(DEFAULT_WORK);

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes œuvres"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_edition")}
    />
  );

  const isSplitValid = (w: Omit<Work, "id">) => {
    if (w.persons.length <= 1) return true;
    const authors = w.persons.filter((p) => p.roles.includes("author"));
    const composers = w.persons.filter((p) => p.roles.includes("composer") || p.roles.includes("arranger"));
    // empty splits = equitable mode (valid), non-empty splits must sum to 100
    const authorsOk = authors.length === 0 || w.splitsAuthors.length === 0 || sumSplits(w.splitsAuthors) === 100;
    const composersOk = composers.length === 0 || w.splitsComposers.length === 0 || sumSplits(w.splitsComposers) === 100;
    const pubTotal = w.externalPublishers.reduce((s, p) => s + p.pct, 0);
    const publishersOk = w.selfPublished || w.externalPublishers.length === 0 || pubTotal === 100;
    return authorsOk && composersOk && publishersOk;
  };

  const handleAddWork = () => {
    if (!newWork.artistName.trim()) { toast.error("Le nom du groupe / de l'artiste est requis."); return; }
    if (!newWork.title.trim()) { toast.error("Le titre de l'œuvre est requis."); return; }
    if (newWork.persons.length === 0) { toast.error("Au moins une personne est requise."); return; }
    if (!isSplitValid(newWork)) { toast.error("La répartition interne doit totaliser 100% pour chaque catégorie."); return; }
    const work: Work = { ...newWork, id: crypto.randomUUID() };
    setWorks((prev) => [...prev, work]);
    if (projectIdParam) {
      setData((prev) => ({
        ...prev,
        projects: {
          projects: prev.projects.projects.map((p) =>
            p.id === projectIdParam
              ? { ...p, linkedWorks: [...new Set([...p.linkedWorks, work.id])], updatedAt: new Date().toISOString() }
              : p
          ),
        },
      }));
    }
    setIsAddOpen(false);
    setNewWork(DEFAULT_WORK);
    toast.success(`« ${work.title} » ajoutée au catalogue.`);
  };

  const handleEditWork = () => {
    if (!selectedWork) return;
    if (!editWork.artistName.trim()) { toast.error("Le nom du groupe / de l'artiste est requis."); return; }
    if (!editWork.title.trim()) { toast.error("Le titre de l'œuvre est requis."); return; }
    if (editWork.persons.length === 0) { toast.error("Au moins une personne est requise."); return; }
    if (!isSplitValid(editWork)) { toast.error("La répartition interne doit totaliser 100% pour chaque catégorie."); return; }
    setWorks((prev) => prev.map((w) => w.id === selectedWork.id ? { ...editWork, id: selectedWork.id } : w));
    setIsEditOpen(false);
    toast.success(`« ${editWork.title} » mise à jour.`);
  };

  const handleDeleteWork = (id: string, title: string) => {
    setWorks((prev) => prev.filter((w) => w.id !== id));
    toast.success(`« ${title} » supprimée.`);
  };

  const openEdit = (work: Work) => {
    setSelectedWork(work);
    const { id: _id, ...rest } = work;
    void _id;
    setEditWork(rest);
    setIsEditOpen(true);
  };

  const kpi = {
    total: works.length,
    inProgress: works.filter((w) => w.status === "in-progress").length,
    finalized: works.filter((w) => w.status === "finalized").length,
    registered: works.filter((w) => w.status === "registered-sacem").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestion des œuvres</h1>
          <p className="mt-1 text-sm text-[#F5F5F5]/60">
            Cataloguez vos œuvres musicales et gérez vos droits d&apos;édition
          </p>
        </div>
        <Button onClick={() => { setNewWork(DEFAULT_WORK); setIsAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une œuvre
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total œuvres", value: kpi.total, Icon: Music, color: "" },
          { label: "En cours", value: kpi.inProgress, Icon: Clock, color: "text-yellow-400" },
          { label: "Finalisées", value: kpi.finalized, Icon: CheckCircle2, color: "text-blue-400" },
          { label: "Déposées SACEM", value: kpi.registered, Icon: CheckCircle2, color: "text-green-400" },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={cn("h-8 w-8 opacity-60", color || "text-[#F5F5F5]/40")} />
              <div>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-[#F5F5F5]/60">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {works.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="mx-auto mb-4 h-12 w-12 text-[#F5F5F5]/20" />
            <p className="mb-4 text-[#F5F5F5]/60">Aucune œuvre dans le catalogue.</p>
            <Button onClick={() => { setNewWork(DEFAULT_WORK); setIsAddOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une première œuvre
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {works.map((work) => (
            <Card key={work.id} className="overflow-hidden">
              <CardContent className="p-5 pb-0">
                <div className="flex gap-6">
                  <div className="flex-1 space-y-3 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {work.artistName && <span className="text-sm text-[#F5F5F5]/50">{work.artistName} —</span>}
                      <h3 className="text-base font-semibold">{work.title}</h3>
                    </div>

                    {(() => {
                      const workProjects = (data.projects?.projects ?? []).filter(
                        (proj) => proj.linkedWorks.includes(work.id)
                      );
                      if (workProjects.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {workProjects.map((proj) => (
                            <a
                              key={proj.id}
                              href={`/projects/${proj.id}`}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#F0FF00]/10 text-[#F0FF00]/60 hover:text-[#F0FF00] border border-[#F0FF00]/20 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {proj.title}
                            </a>
                          ))}
                        </div>
                      );
                    })()}

                    {work.linkedTrackIds && work.linkedTrackIds.length > 0 && (() => {
                      const tracks = (data.phono?.tracks ?? []).filter((t) =>
                        work.linkedTrackIds!.includes(t.id)
                      );
                      if (tracks.length === 0) return null;
                      return (
                        <p className="text-[10px] text-[#F0FF00]/50">
                          ↔ {tracks.map((t) => t.title).join(", ")}
                        </p>
                      );
                    })()}

                    {work.persons.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs text-[#F5F5F5]/50">Personnes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {work.persons.map((p) => (
                            <span key={p.id} className="rounded bg-[rgba(245,245,245,0.08)] px-2 py-0.5 text-xs">
                              {getPersonDisplayName(p)} · {p.roles.map(getRoleLabel).join(", ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-[#F5F5F5]/60">
                      {work.iswc && <span>ISWC : {work.iswc}</span>}
                      {work.firstExploitationDate && (
                        <span>1ère exploit. : {new Date(work.firstExploitationDate).toLocaleDateString("fr-FR")}</span>
                      )}
                      {work.genre && <span>Genre : {work.genre}</span>}
                      {work.duration && <span>Durée : {work.duration}</span>}
                      {work.firstBroadcaster && <span>1er diffuseur : {work.firstBroadcaster}</span>}
                      {!work.selfPublished && work.externalPublishers.length > 0 && (
                        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-300">
                          {work.externalPublishers.map((p) => p.name).filter(Boolean).join(", ") || "Éditeur"}
                        </Badge>
                      )}
                    </div>

                    {work.exploitationTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {work.exploitationTypes.map((t) => (
                          <Badge key={t} className="border-indigo-500/30 bg-indigo-500/20 text-xs text-indigo-300">
                            {getExploitationLabel(t)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(work.worldwideRights || work.territories.length > 0) && (
                      <p className="text-xs text-[#F5F5F5]/50">
                        Territoires : {work.worldwideRights ? "Monde entier" : work.territories.join(", ")}
                      </p>
                    )}

                    {work.notes && <p className="text-xs italic text-[#F5F5F5]/50">{work.notes}</p>}
                  </div>

                  <div className="shrink-0 pb-5 flex flex-col items-end gap-3">
                    <StatusTimeline status={work.status} onChange={(s) => {
                      setWorks((prev) => prev.map((w) => w.id === work.id ? { ...w, status: s } : w));
                    }} />
                    <div className="flex gap-2 mt-auto">
                      <Button variant="outline" size="sm" onClick={() => openEdit(work)}>
                        <Edit2 className="mr-1 h-3.5 w-3.5" /> Éditer
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteWork(work.id, work.title)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <RightsPieCharts work={work} />
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-full max-w-2xl border-2">
          <DialogHeader><DialogTitle>Ajouter une œuvre</DialogTitle></DialogHeader>
          <WorkForm work={newWork} setWork={setNewWork} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddWork}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-full max-w-2xl border-2">
          <DialogHeader><DialogTitle>Modifier l&apos;œuvre</DialogTitle></DialogHeader>
          <WorkForm work={editWork} setWork={setEditWork} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEditWork}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

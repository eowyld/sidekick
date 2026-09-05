# Refonte des Sessions Studio — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de `SessionsStudioPage.tsx` (688 lignes, deux tableaux de huit colonnes) un registre de sessions lisible : une ligne qui montre enfin les intervenants, leurs rôles et les titres travaillés, un formulaire unique qui n'invente plus de date, et un lien réel entre une session, le catalogue et les contacts.

**Architecture:** Approche verticale, comme le plan Catalogue. Une phase 0 déplace les types, extrait le métier vers `src/modules/phono/lib/session.ts` et migre la base sans changement visible ; puis la vue de lecture, puis l'édition, puis la diffusion. L'ancien formulaire reste branché tant que le nouveau n'est pas livré.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, Radix UI, SWR, Supabase (Postgres), `lucide-react`, `sonner`.

**Spec:** [docs/superpowers/specs/2026-09-04-refonte-sessions-studio-design.md](../specs/2026-09-04-refonte-sessions-studio-design.md)

**Chantier voisin :** le [plan Catalogue](2026-09-04-refonte-phono-catalogue.md) est en cours d'exécution. Sa **phase 0 est livrée** : `src/modules/phono/lib/` contient déjà `track.ts`, `release-status.ts`, `album.ts`, `metadata-payload.ts` et `audio-limits.ts`. Ce plan les consomme et n'en modifie aucun. Il ne touche ni `CatalogPage.tsx`, ni `src/lib/sidekick-store.ts` au-delà de l'ajout des types de session, ni aucun fichier du chantier Liens d'écoute.

---

## Conventions de ce plan — à lire avant de commencer

**Pas de tests automatisés.** Le dépôt n'a pas de suite de tests (`CLAUDE.md`). Le cycle TDD habituel est remplacé par, à chaque tâche :

```bash
npx tsc --noEmit && npm run build
npx eslint <les fichiers touchés par la tâche>
```

> **`npm run lint` ne peut pas servir de garde-fou** : le dépôt compte déjà 204 problèmes (80 erreurs) hérités, dans `app/(blog)/`, `Sidebar.tsx`, `Tasks.tsx`, `tailwind.config.ts` et d'autres fichiers hors périmètre. Lancer `eslint .` renverra toujours un échec, quoi que fasse la tâche. Le lint est donc **ciblé sur les fichiers touchés**, qui eux doivent être propres. Nettoyer la dette existante n'appartient pas à ce chantier.

puis un **parcours manuel en dev local** (`npm run dev`) dont chaque tâche précise les gestes exacts et le résultat attendu. Une tâche n'est pas finie tant que ce parcours n'a pas été fait.

**Commits.** `CLAUDE.md` impose de ne commiter que sur demande explicite de l'utilisateur. Les commandes de commit sont écrites dans le plan, mais **ne les exécute pas sans que l'utilisateur l'ait demandé**. Demande à la fin de chaque phase.

**Niveau de détail du code.** Le code complet est donné pour tout ce qui est exact ou piégeux : `lib/session.ts`, migration SQL, mappers, contrats de types, interfaces de props. Pour les composants d'affichage, le plan fige **l'interface de props, la structure et les tokens de design** ; le balisage interne est écrit à l'implémentation en suivant les composants de référence nommés.

**Design system.** Fond `#101010`, texte `#F5F5F5`, muted `rgba(245,245,245,0.7)`, accent `#F0FF00`. Conteneur de section :
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`. Chiffres en `font-extralight tabular-nums`. Icônes `lucide-react` uniquement. **Aucune classe claire** (`bg-white`, `text-gray-900`, `bg-muted`, `text-muted-foreground`, `text-destructive`) : le fichier actuel en est truffé, aucune ne doit survivre à la refonte.

**Références visuelles** à imiter : `src/modules/live/components/LiveOverviewPage.tsx:341-400` (section, barre segmentée, légende cliquable, gros chiffre), `src/modules/tasks/components/TaskCard.tsx` (ligne lisible, menu d'actions, édition inline), `src/modules/tasks/components/TaskModal.tsx` (modale de formulaire), `src/modules/contacts/components/ContactsPage.tsx` (barre de recherche et filtres).

**Notifications.** Le shell monte déjà `<Toaster richColors theme="dark" />` de `sonner` (`app/(app)/layout.tsx`). Utiliser `toast.success(…)` / `toast.error(…)` pour les retours transitoires. Les erreurs qui bloquent une action restent affichées **dans** le dialog concerné.

**Écritures.** Toutes passent par `setSessions((prev) => …)` de `usePhonoData`, jamais d'appel Supabase direct depuis un composant : le pattern optimiste du hook (snapshot synchrone, IIFE async, rollback) s'en charge.

---

## Structure des fichiers

**À créer**

| Fichier | Responsabilité |
|---|---|
| `src/modules/phono/lib/session.ts` | Types de listes, normalisation, durées, dates, agrégats, feuille de session |
| `src/modules/phono/components/sessions/SessionsHeader.tsx` | Bandeau « activité studio » et filtres cliquables |
| `src/modules/phono/components/sessions/SessionRow.tsx` | Une ligne de session, lecture seule, dépliable |
| `src/modules/phono/components/sessions/SessionDialog.tsx` | Formulaire unique création + édition |
| `src/modules/phono/components/sessions/SessionParticipantsField.tsx` | Intervenants, rôles, suggestions de contacts |
| `src/modules/phono/components/sessions/SessionTracksField.tsx` | Sélection des titres travaillés |
| `src/modules/phono/components/sessions/SessionSheetDialog.tsx` | Feuille de session copiable |
| `supabase/migrations/20260904120000_phono_sessions.sql` | `end_time`, `track_ids`, `cost`, dates en ISO |

**À modifier**

| Fichier | Changement |
|---|---|
| `src/lib/sidekick-store.ts` | Ajout de `SessionType`, `SessionParticipant`, `StudioSession` |
| `src/hooks/usePhonoData.ts` | Types importés au lieu d'être déclarés, mappers tolérants |
| `src/modules/phono/components/SessionsStudioPage.tsx` | Passe de 688 à ~170 lignes d'orchestration |
| `src/modules/projects/components/sections/PhonoSection.tsx` | Lectures phono rebranchées sur Supabase |
| `src/modules/projects/components/tabs/CreationTab.tsx` | Deux lignes phono de `signalCtx` rebranchées |

**Aucune route ajoutée.** `app/(app)/phono/sessions-studio/page.tsx` importe `SessionsStudioPage` depuis `@/modules/phono/components/SessionsStudioPage` : le fichier garde son chemin. L'entrée de sidebar existe déjà (`src/components/layout/Sidebar.tsx:62`).

---

# Phase 0 — Socle

Aucun changement visible à l'écran, sauf l'ordre chronologique des lignes qui devient correct. C'est le critère de vérification de la phase.

## Task 1 : Types de session dans `sidekick-store`

**Files:**
- Modify: `src/lib/sidekick-store.ts`

- [ ] **Step 1 : Ajouter les trois types**

Les types de session vivent aujourd'hui dans `src/hooks/usePhonoData.ts:11-28`, à part de `Track`, `Album` et `Mix`. Les déplacer aligne le module. Insérer dans `src/lib/sidekick-store.ts`, juste après la déclaration de `PhonoRole` (l. 334-345) :

```ts
/** Nature d'une séance studio. `autre` ouvre un champ libre `sessionTypeOther`. */
export type SessionType = "prise" | "essai" | "mix" | "mastering" | "autre";

/**
 * Un intervenant sur une séance studio.
 *
 * Historiquement `id: number` issu de `Date.now()` — deux ajouts dans la même
 * milliseconde produisaient deux ids identiques — et `role` en chaîne libre.
 * La colonne `participants` est un `jsonb` : elle accepte les deux formes.
 * `normalizeSessionParticipants` convertit à la lecture, l'écriture se fait
 * toujours au nouveau format.
 */
export type SessionParticipant = {
  id: string;
  /** Lien vers `user_contacts.id` quand l'intervenant est un contact connu. */
  contactId?: string;
  name: string;
  role: PhonoRole;
};

/**
 * Une séance studio.
 *
 * Unité du registre d'enregistrement : un créneau qui croise des intervenants
 * et des titres. C'est ce croisement qui alimente une déclaration de droits
 * voisins, et c'est pour lui qu'existe `trackIds`.
 *
 * Déclaré en `type` et non en `interface` à dessein : `SidekickData.phono
 * .sessions` est typé `Session[]`, qui porte un index signature
 * `[key: string]: unknown`. Seul un alias de type bénéficie de l'index
 * signature implicite qui rend l'affectation possible — une `interface` ferait
 * échouer `creation-logic.ts`.
 */
export type StudioSession = {
  id: string;
  title: string;
  /** ISO `YYYY-MM-DD`. Vide si non renseignée (données historiques). */
  date: string;
  /** `HH:MM` de début, ou chaîne vide. Aucune valeur par défaut n'est inventée. */
  time: string;
  /** `HH:MM` de fin. Absente, la session ne compte pas dans le total d'heures. */
  endTime?: string;
  location: string;
  address?: string;
  sessionType: SessionType;
  sessionTypeOther?: string;
  participants: SessionParticipant[];
  /** `Track.id` des titres travaillés. Les ids orphelins sont ignorés. */
  trackIds: string[];
  /** Coût total en euros TTC. `undefined` = non renseigné, ce qui n'est pas 0. */
  cost?: number;
  note?: string;
};
```

Ne **pas** toucher au type `Session` existant (l. 443-448) : il sert à `SidekickData.phono.sessions` et à `src/modules/projects/data/creation-logic.ts`, qui restent en l'état.

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit
```
Attendu : aucune erreur. Les types ajoutés n'ont encore aucun consommateur — `usePhonoData` déclare toujours les siens, en doublon, jusqu'à la tâche 4.

---

## Task 2 : `lib/session.ts` — tout le métier

**Files:**
- Create: `src/modules/phono/lib/session.ts`

- [ ] **Step 1 : Écrire le module**

```ts
// src/modules/phono/lib/session.ts
import type {
  PhonoRole,
  SessionParticipant,
  SessionType,
  StudioSession,
  Track,
} from "@/lib/sidekick-store";
import { toIsoDatePickerValue, toDisplayDate } from "@/lib/date-format";
import { normalizePhonoRole, roleLabel, ROLES } from "./track";

// ─── Types de session ────────────────────────────────────────────────────────

export const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "prise", label: "Prise" },
  { value: "essai", label: "Essai" },
  { value: "mix", label: "Mix" },
  { value: "mastering", label: "Mastering" },
  { value: "autre", label: "Autre" },
];

/**
 * Couleurs du bandeau. Même rôle que `RELEASE_STATUS_COLOR` dans le catalogue :
 * une teinte stable réutilisée par la barre segmentée, la légende et la
 * pastille de ligne.
 */
export const SESSION_TYPE_COLOR: Record<SessionType, string> = {
  prise: "#38BDF8",
  essai: "#F59E0B",
  mix: "#A78BFA",
  mastering: "#34D399",
  autre: "rgba(245,245,245,0.35)",
};

export function sessionTypeLabel(type: SessionType, other?: string): string {
  if (type === "autre" && other?.trim()) return other.trim();
  return SESSION_TYPES.find((t) => t.value === type)?.label ?? type;
}

// ─── Identifiants ────────────────────────────────────────────────────────────

export function newSessionId(): string {
  return "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function newParticipantId(): string {
  return "sp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

// ─── Normalisation ───────────────────────────────────────────────────────────

/** Rôles historiques absents de `PhonoRole`, encore présents en base. */
const LEGACY_ROLES: Record<string, PhonoRole> = {
  musicien: "musicien_interprete",
  chanteur: "chanteur_interprete",
};

/**
 * Ramène n'importe quelle chaîne stockée à un `PhonoRole` connu. La colonne
 * `participants` est un `jsonb` sans contrainte : elle a pu recevoir n'importe
 * quoi. Une valeur inconnue retombe sur `artiste_principal`, jamais sur une
 * chaîne qui ferait afficher une clé brute dans l'interface.
 */
function coerceParticipantRole(raw: string): PhonoRole {
  const legacy = LEGACY_ROLES[raw];
  if (legacy) return legacy;
  const normalized = normalizePhonoRole(raw as PhonoRole);
  return ROLES.some((r) => r.value === normalized) ? normalized : "artiste_principal";
}

/**
 * Convertit les intervenants vers `SessionParticipant[]`, quelle que soit la
 * forme stockée : id numérique, rôle libre, champ manquant.
 */
export function normalizeSessionParticipants(
  raw: unknown
): SessionParticipant[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): SessionParticipant => {
      const p = (entry ?? {}) as Record<string, unknown>;
      const role = coerceParticipantRole(String(p.role ?? "artiste_principal"));
      const contactId = String(p.contactId ?? "").trim();
      return {
        id: p.id !== undefined && p.id !== null ? String(p.id) : newParticipantId(),
        contactId: contactId || undefined,
        name: String(p.name ?? "").trim(),
        role,
      };
    })
    .filter((p) => p.name !== "");
}

/** Coût saisi au clavier (« 1 200 », « 450,50 ») vers un nombre, ou `undefined`. */
export function parseCostInput(raw: string): number | undefined {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Comble les champs absents d'une session venue de la base et convertit sa date
 * au format ISO si elle est encore en `JJ/MM/AAAA`.
 *
 * Les chaînes sont coercées en `""` plutôt que laissées à `undefined` : elles
 * alimentent des `<Input value={…}>`, et un passage `undefined → string` ferait
 * basculer React du mode non contrôlé au mode contrôlé en cours de saisie.
 */
export function normalizeSession(s: StudioSession): StudioSession {
  return {
    ...s,
    id: s.id,
    title: s.title ?? "",
    date: toIsoDatePickerValue(s.date ?? ""),
    time: s.time ?? "",
    endTime: (s.endTime ?? "").trim() || undefined,
    location: s.location ?? "",
    address: (s.address ?? "").trim() || undefined,
    sessionType: (s.sessionType ?? "prise") as SessionType,
    sessionTypeOther: (s.sessionTypeOther ?? "").trim() || undefined,
    participants: normalizeSessionParticipants(s.participants),
    trackIds: Array.isArray(s.trackIds) ? s.trackIds.map(String) : [],
    cost: typeof s.cost === "number" && Number.isFinite(s.cost) ? s.cost : undefined,
    note: (s.note ?? "").trim() || undefined,
  };
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Date du jour en ISO, dans le fuseau local. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** ISO du même jour il y a `months` mois. Sert à la fenêtre glissante du bandeau. */
export function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Une session est passée si sa date est strictement antérieure à aujourd'hui.
 * Comparaison de chaînes ISO : lexicographique et chronologique à la fois, sans
 * fuseau ni `Date` intermédiaire.
 */
export function isSessionPast(session: StudioSession, today = todayIso()): boolean {
  if (!session.date) return false;
  return session.date < today;
}

/** « ven. 12 sept. 2025 ». Chaîne vide si la date est absente ou invalide. */
export function sessionDateLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  // Midi local : évite le décalage d'un jour au passage par UTC.
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** « 26/08/2025 », pour la feuille de session. Tolère un stockage encore FR. */
export function sessionShortDate(iso: string): string {
  return toDisplayDate(iso);
}

// ─── Durée ───────────────────────────────────────────────────────────────────

function minutesOfClock(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Durée en minutes, ou `null` si début ou fin manque.
 *
 * Une fin antérieure au début est une session qui passe minuit (22:00 → 03:00),
 * pas une erreur de saisie : on ajoute 24 h.
 */
export function sessionDurationMinutes(session: StudioSession): number | null {
  const start = minutesOfClock(session.time ?? "");
  const end = minutesOfClock(session.endTime ?? "");
  if (start === null || end === null) return null;
  const raw = end - start;
  return raw >= 0 ? raw : raw + 24 * 60;
}

/** Vrai si la session se termine le lendemain. Sert à lever l'ambiguïté à la saisie. */
export function sessionCrossesMidnight(session: StudioSession): boolean {
  const start = minutesOfClock(session.time ?? "");
  const end = minutesOfClock(session.endTime ?? "");
  if (start === null || end === null) return false;
  return end < start;
}

/** « 5 h », « 1 h 30 », « 45 min ». */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/**
 * « 2 340 € », « 450,50 € ». Les centimes ne s'affichent que s'il y en a :
 * `minimumFractionDigits` doit être posé explicitement, faute de quoi le style
 * `currency` impose deux décimales et un budget rond s'écrit « 2 340,00 € ».
 */
export function formatEuros(amount: number): string {
  const hasCents = amount % 1 !== 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

// ─── Rattachements ───────────────────────────────────────────────────────────

/**
 * Titres travaillés, dans l'ordre de `trackIds`. Un id dont le titre a été
 * supprimé du catalogue est ignoré : il disparaît de l'affichage et sera purgé
 * au prochain enregistrement de la session.
 */
export function sessionTracks(session: StudioSession, allTracks: Track[]): Track[] {
  const byId = new Map(allTracks.map((t) => [t.id, t]));
  return (session.trackIds ?? [])
    .map((id) => byId.get(id))
    .filter((t): t is Track => Boolean(t));
}

/** Libellé de la ligne quand aucun titre n'a été saisi. */
export function sessionDisplayTitle(session: StudioSession): string {
  const title = (session.title ?? "").trim();
  if (title) return title;
  const type = sessionTypeLabel(session.sessionType, session.sessionTypeOther);
  const place = (session.location ?? "").trim();
  return place ? `${type} — ${place}` : type;
}

/** Noms d'intervenants déjà employés, dédoublonnés, pour les suggestions de saisie. */
export function knownParticipantNames(sessions: StudioSession[]): string[] {
  const seen = new Map<string, string>();
  sessions.forEach((s) =>
    (s.participants ?? []).forEach((p) => {
      const name = (p.name ?? "").trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    })
  );
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
}

// ─── Agrégats du bandeau ─────────────────────────────────────────────────────

export interface SessionStats {
  /** Sessions de la fenêtre glissante. */
  count: number;
  /** Minutes cumulées, sur les seules sessions ayant une heure de fin. */
  minutes: number;
  /** Nombre de sessions ayant compté dans `minutes`. */
  minutesFrom: number;
  /** Euros cumulés, sur les seules sessions ayant un coût renseigné. */
  cost: number;
  /** Nombre de sessions ayant compté dans `cost`. */
  costFrom: number;
  /** Répartition par type, types à zéro exclus, dans l'ordre de `SESSION_TYPES`. */
  byType: { type: SessionType; count: number }[];
  /** Sessions **passées** sans aucun intervenant. */
  missingParticipants: number;
  /** Sessions **passées** sans aucun titre rattaché. */
  missingTracks: number;
}

/**
 * Agrégats sur une fenêtre glissante de douze mois. Un registre studio se lit
 * par saison de travail ; un total depuis toujours ne dit rien d'actionnable.
 * Les sessions hors fenêtre restent listées, elles ne comptent simplement pas.
 *
 * Les deux compteurs d'anomalie ne portent que sur le passé : une session à
 * venir sans intervenant n'est pas un trou de registre, c'est une séance pas
 * encore préparée.
 */
export function computeSessionStats(
  sessions: StudioSession[],
  today = todayIso()
): SessionStats {
  const since = monthsAgoIso(12);
  const inWindow = sessions.filter((s) => s.date && s.date >= since);

  let minutes = 0;
  let minutesFrom = 0;
  let cost = 0;
  let costFrom = 0;
  const byType = new Map<SessionType, number>();

  inWindow.forEach((s) => {
    const d = sessionDurationMinutes(s);
    if (d !== null) {
      minutes += d;
      minutesFrom += 1;
    }
    if (typeof s.cost === "number") {
      cost += s.cost;
      costFrom += 1;
    }
    byType.set(s.sessionType, (byType.get(s.sessionType) ?? 0) + 1);
  });

  const past = sessions.filter((s) => isSessionPast(s, today));

  return {
    count: inWindow.length,
    minutes,
    minutesFrom,
    cost,
    costFrom,
    byType: SESSION_TYPES.map((t) => ({
      type: t.value,
      count: byType.get(t.value) ?? 0,
    })).filter((entry) => entry.count > 0),
    missingParticipants: past.filter((s) => (s.participants ?? []).length === 0).length,
    missingTracks: past.filter((s) => (s.trackIds ?? []).length === 0).length,
  };
}

// ─── Feuille de session ──────────────────────────────────────────────────────

/**
 * Rendu texte d'une session, à coller dans un mail, un dossier SPEDIDAM ou un
 * échange avec un producteur. Pendant de `formatTracklistForCopy` côté Mixes :
 * une fonction pure, un presse-papier, aucun PDF.
 */
export function formatSessionSheet(
  session: StudioSession,
  allTracks: Track[]
): string {
  const lines: string[] = [];

  lines.push(`Session — ${sessionDisplayTitle(session)}`);

  const duration = sessionDurationMinutes(session);
  const schedule = [
    sessionTypeLabel(session.sessionType, session.sessionTypeOther),
    sessionShortDate(session.date),
    session.endTime && session.time
      ? `${session.time}–${session.endTime}${duration !== null ? ` (${formatDurationMinutes(duration)})` : ""}`
      : session.time || "",
  ].filter(Boolean);
  lines.push(schedule.join(" · "));

  const place = [session.location, session.address].map((v) => (v ?? "").trim()).filter(Boolean);
  if (place.length > 0) lines.push(place.join(", "));

  const tracks = sessionTracks(session, allTracks);
  if (tracks.length > 0) {
    lines.push("", "Titres travaillés");
    tracks.forEach((t) => {
      const isrc = (t.isrc ?? "").trim();
      lines.push(`- ${t.title} — ${isrc || "ISRC non attribué"}`);
    });
  }

  const participants = session.participants ?? [];
  if (participants.length > 0) {
    lines.push("", "Intervenants");
    participants.forEach((p) => lines.push(`- ${p.name} — ${roleLabel(p.role)}`));
  }

  const note = (session.note ?? "").trim();
  if (note) lines.push("", "Notes", note);

  return lines.join("\n");
}
```

> `roleLabel` et `normalizePhonoRole` viennent de `./track`, livré par la phase 0 du plan Catalogue. Ne pas redéclarer une liste de rôles locale : c'est exactement la duplication que cette refonte supprime.

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit 2>&1 | grep "modules/phono/lib"
npx eslint src/modules/phono/lib/session.ts
```
Attendu : aucune ligne pour le premier, aucun problème pour le second. Le module compile seul, il n'a encore aucun consommateur.

---

## Task 3 : Migration SQL

**Files:**
- Create: `supabase/migrations/20260904120000_phono_sessions.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Sessions studio : heure de fin, titres travaillés, coût, dates en ISO.
--
-- La colonne `date` est un texte qui stockait 'JJ/MM/AAAA'. Le fetcher fait
-- `order("date", { ascending: false })` : sur ce format, le tri est
-- alphabétique sur le jour, et le 30/01 passe avant le 02/12. La conversion en
-- 'AAAA-MM-JJ' rend le tri SQL chronologique.
--
-- Les consommateurs tolèrent déjà les deux formats : `normalizeToDateKey`
-- (GlobalCalendarPage) et `parseDate` (DashboardPage) testent l'un puis
-- l'autre. La conversion est donc sans risque pour le calendrier et le
-- dashboard.

alter table public.user_phono_sessions
  add column if not exists end_time text;

alter table public.user_phono_sessions
  add column if not exists track_ids jsonb not null default '[]'::jsonb;

alter table public.user_phono_sessions
  add column if not exists cost numeric;

-- Conversion JJ/MM/AAAA -> AAAA-MM-JJ. Les lignes déjà ISO et les dates vides
-- ne matchent pas le motif et restent intactes.
update public.user_phono_sessions
set date =
      substring(date from 7 for 4) || '-' ||
      substring(date from 4 for 2) || '-' ||
      substring(date from 1 for 2)
where date ~ '^\d{2}/\d{2}/\d{4}$';
```

> Pas de contrainte `check` sur le format de `date` : les lignes historiques peuvent contenir une chaîne vide (le défaut de la colonne est `''`), et une contrainte rejetterait ces lignes au premier `update` sans rapport. La tolérance est portée par `normalizeSession`.

- [ ] **Step 2 : Appliquer et vérifier**

Appliquer la migration sur la base de dev, puis :

```sql
-- Attendu : 0 ligne. Toute ligne renvoyée est une date ni ISO ni vide.
select id, date from public.user_phono_sessions
where date <> '' and date !~ '^\d{4}-\d{2}-\d{2}$';

-- Attendu : les trois colonnes existent, track_ids vaut '[]', cost vaut null.
select id, date, end_time, track_ids, cost
from public.user_phono_sessions order by date desc limit 5;

-- Attendu : la policy « user owns sessions » est toujours là.
select policyname from pg_policies where tablename = 'user_phono_sessions';
```

---

## Task 4 : Mappers de `usePhonoData`

**Files:**
- Modify: `src/hooks/usePhonoData.ts:11-30`, `:171-200`

- [ ] **Step 1 : Importer les types au lieu de les déclarer**

Supprimer les déclarations locales `SessionParticipant` et `StudioSession` (l. 11-28) et les remplacer par un import et une ré-exportation — `SessionsStudioPage.tsx` importe `StudioSession` depuis ce hook, et d'autres modules pourraient le faire :

```ts
import type {
  Track, Album, Podcast, Mix, TrackGuest,
  SessionParticipant, SessionType, StudioSession,
} from "@/lib/sidekick-store";
import { normalizeSession, normalizeSessionParticipants } from "@/modules/phono/lib/session";

export type { Track, Album, Podcast, SessionParticipant, SessionType, StudioSession };
```

- [ ] **Step 2 : Remplacer les deux mappers**

```ts
function sessionToRow(s: StudioSession, userId: string): Record<string, unknown> {
  return {
    id: s.id,
    user_id: userId,
    title: s.title ?? "",
    date: s.date ?? "",
    time: s.time ?? "",
    end_time: s.endTime ?? null,
    location: s.location ?? "",
    address: s.address ?? null,
    session_type: s.sessionType ?? "prise",
    session_type_other: s.sessionTypeOther ?? null,
    // Toujours écrit au nouveau format. Combiné à la normalisation en lecture,
    // les participants historiques (id numérique, rôle libre) se convertissent
    // d'eux-mêmes au fil des enregistrements, sans migration de contenu.
    participants: normalizeSessionParticipants(s.participants),
    track_ids: s.trackIds ?? [],
    cost: typeof s.cost === "number" ? s.cost : null,
    note: s.note ?? null,
  };
}

function rowToSession(row: Record<string, unknown>): StudioSession {
  return normalizeSession({
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    time: (row.time as string) ?? "",
    endTime: (row.end_time as string) ?? undefined,
    location: (row.location as string) ?? "",
    address: (row.address as string) ?? undefined,
    sessionType: ((row.session_type as SessionType) ?? "prise"),
    sessionTypeOther: (row.session_type_other as string) ?? undefined,
    participants: normalizeSessionParticipants(row.participants),
    trackIds: (row.track_ids as string[]) ?? [],
    cost: typeof row.cost === "number" ? row.cost : row.cost != null ? Number(row.cost) : undefined,
    note: (row.note as string) ?? undefined,
  });
}
```

> `cost` est un `numeric` Postgres : le client `supabase-js` le renvoie tantôt en `number`, tantôt en `string` selon la précision. La double coercition ci-dessus couvre les deux cas ; `normalizeSession` écarte ensuite tout `NaN`.

Le setter `setSessions` (l. 329) et la clé de tranche `"sessions"` sont inchangés : le pattern optimiste ne bouge pas.

- [ ] **Step 3 : Adapter l'appelant existant**

`SessionsStudioPage.tsx` déclare ses propres `SessionType`, `ParticipantRole`, `ParticipantEntry`, `SESSION_TYPES`, `PARTICIPANT_ROLES`, `normalizeParticipantRole`, `sessionTypeLabel`, `parseFrDate` et `isSessionPast`. Ils entrent en conflit de sémantique avec les nouveaux types (`id: number` vs `string`).

À cette tâche, faire le strict minimum pour que le fichier compile et se comporte comme avant : dans `openEdit`, `saveSession` et `addParticipant`, les participants deviennent des `SessionParticipant` — `id: newParticipantId()` au lieu de `Date.now()`, et `role` typé `PhonoRole`. Les dates manipulées par le formulaire passent par `toIsoDatePickerValue` en lecture et sont enregistrées **en ISO** :

```ts
// openEdit : la valeur du DatePicker est déjà l'ISO stocké.
date: s.date,

// saveSession : plus de conversion isoToFr, plus de date par défaut.
date: form.date.trim(),
```

`isSessionPast` local et `parseFrDate` sont supprimés au profit de `isSessionPast` de `lib/session.ts`. Le reste du fichier est réécrit à la tâche 7 : ne pas y investir davantage.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run build
npx eslint src/hooks/usePhonoData.ts src/modules/phono/components/SessionsStudioPage.tsx
```

Puis `npm run dev`, sur `/phono/sessions-studio` :

1. Les sessions existantes s'affichent, avec la bonne date au jour près.
2. Les sections « Passées » et « À venir » contiennent les bonnes sessions.
3. Modifier une session, enregistrer, recharger → date, heure et participants intacts.
4. Dans Supabase, la ligne modifiée a une `date` en `AAAA-MM-JJ` et des participants dont l'`id` est une chaîne `sp-…`.
5. Ouvrir `/calendrier` et le dashboard → les sessions apparaissent aux mêmes dates qu'avant.

- [ ] **Step 5 : Commit** *(sur demande de l'utilisateur uniquement)*

```bash
git add src/lib/sidekick-store.ts src/modules/phono/lib/session.ts src/hooks/usePhonoData.ts supabase/migrations/20260904120000_phono_sessions.sql src/modules/phono/components/SessionsStudioPage.tsx
git commit -m "refactor(phono): socle des sessions studio, dates ISO et titres rattachés

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

**Fin de phase 0.** Rien n'a changé à l'écran, sauf que l'ordre des sessions est désormais juste. Demander à l'utilisateur s'il souhaite commiter avant de continuer.

---

# Phase 1 — Lecture

À la fin de cette phase, la page se lit : le bandeau, les deux sections, la ligne dépliable. L'ancien formulaire reste branché tel quel, il est remplacé en phase 2.

## Task 5 : `SessionsHeader`

**Files:**
- Create: `src/modules/phono/components/sessions/SessionsHeader.tsx`

- [ ] **Step 1 : Contrat de props**

Le type de filtre est exporté d'ici et consommé par `SessionsStudioPage` (tâche 7) : il porte le même nom dans les deux.

```ts
import type { SessionType, StudioSession } from "@/lib/sidekick-store";

export type SessionFilter =
  | { kind: "none" }
  | { kind: "type"; type: SessionType }
  | { kind: "missing-participants" }
  | { kind: "missing-tracks" };

export interface SessionsHeaderProps {
  sessions: StudioSession[];
  filter: SessionFilter;
  onFilterChange: (filter: SessionFilter) => void;
}
```

- [ ] **Step 2 : Structurer le bandeau**

Modèle direct : `LiveOverviewPage.tsx:341-400`. Conteneur
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`.

```
┌──────────────────────────────────────────────────────────────────┐
│  Studio                                                  14      │
│  Tes sessions des 12 derniers mois   sessions · 63 h · 2 340 €   │
│                                                                  │
│  ████████████████░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒                     │
│  ● 7 Prise   ● 3 Essai   ● 3 Mix   ● 1 Mastering                 │
│                                                                  │
│  ⚠ 4 sans intervenant       ⚠ 6 sans titre rattaché              │
└──────────────────────────────────────────────────────────────────┘
```

- Toutes les valeurs viennent d'un seul `useMemo(() => computeSessionStats(sessions), [sessions])`. Aucun calcul dans le JSX.
- Barre segmentée : `flex h-2.5 gap-0.5 overflow-hidden rounded-full`, chaque segment `flexGrow: count`, `minWidth: 14`, `background: SESSION_TYPE_COLOR[type]`. `stats.byType` exclut déjà les types à zéro.
- Total à droite en `text-[28px] font-extralight leading-none tabular-nums`, sous-ligne en `text-[11px] text-[#F5F5F5]/45` : `{count} sessions · {formatDurationMinutes(minutes)} · {formatEuros(cost)}`. Accord singulier/pluriel sur « session ».
- **Honnêteté des agrégats** : si `minutesFrom < count`, la sous-ligne précise « sur {minutesFrom} sessions renseignées » ; même règle pour le coût si `costFrom < count`. Un total silencieusement partiel est un total faux.
- Si `count === 0`, remplacer barre et légende par « Aucune session sur les douze derniers mois. » en `text-sm text-[#F5F5F5]/45`, et masquer la sous-ligne chiffrée.
- **Segments et légende sont des filtres** : cliquer « Mix » appelle `onFilterChange({ kind: "type", type: "mix" })` ; recliquer le filtre actif renvoie `{ kind: "none" }`. Le filtre actif porte un anneau `ring-1 ring-[#F0FF00]`.
- Les chips ⚠ (icône `AlertTriangle` 12 px, couleur `#F59E0B`) ne s'affichent que si leur compte est non nul, et basculent le filtre de la même façon. Libellés exacts : « {n} sans intervenant », « {n} sans titre rattaché ».
- Chaque élément cliquable est un `<button type="button">` avec un `aria-pressed` reflétant l'état actif.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npx eslint src/modules/phono/components/sessions/SessionsHeader.tsx
```
La vérification fonctionnelle a lieu à la tâche 7, une fois le bandeau monté.

---

## Task 6 : `SessionRow`

**Files:**
- Create: `src/modules/phono/components/sessions/SessionRow.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
import type { StudioSession, Track } from "@/lib/sidekick-store";

export interface SessionRowProps {
  session: StudioSession;
  /** Tout le catalogue : la ligne résout elle-même `session.trackIds`. */
  tracks: Track[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSheet: () => void;
}
```

- [ ] **Step 2 : Structurer la ligne**

Aucun `<input>`, aucun `<Select>` dans ce composant.

```
┌──────────────────────────────────────────────────────────────────┐
│ ▸  ven. 12 sept. 2025    14:00–19:00 · 5 h        ● Prise        │
│    Session voix chœur              Studio Bleu, Paris 11    📍   │
│    3 intervenants · 2 titres · 450 €                        ⋯    │
└──────────────────────────────────────────────────────────────────┘
```

- Conteneur : `rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4`, `hover:border-[rgba(245,245,245,0.18)] transition-colors`. Chevron `ChevronRight` pivotant de 90° quand `expanded`.
- **Première ligne, la plus lourde visuellement** : `sessionDateLabel(session.date)` en `text-sm font-medium text-[#F5F5F5]`, puis les horaires en `text-xs tabular-nums text-[#F5F5F5]/55` — `{time}–{endTime} · {formatDurationMinutes(d)}`, réduit à `{time}` sans fin, omis sans heure. À droite, pastille de 8 px `SESSION_TYPE_COLOR[type]` + `sessionTypeLabel` en `text-xs`.
- Sans date (donnée historique) : afficher « Date non renseignée » en `#F59E0B`.
- Deuxième ligne : `sessionDisplayTitle(session)` en `text-sm text-[#F5F5F5]/80`, et à droite le lieu en `text-xs text-[#F5F5F5]/45` suivi du lien `MapPin` de 14 px vers Google Maps. Conserver la construction d'URL actuelle (`SessionsStudioPage.tsx:111-115`), déplacée telle quelle dans ce fichier, et ses attributs `target="_blank" rel="noopener noreferrer"`.
- Troisième ligne, en `text-xs text-[#F5F5F5]/45` : `{n} intervenants · {m} titres · {formatEuros(cost)}`, chaque segment omis quand il vaut zéro ou n'est pas renseigné. Accords au singulier gérés.
- `DropdownMenu` sur `⋯` : Modifier · Feuille de session · Dupliquer · Supprimer (dernier en `text-red-400`). Suivre `TaskCard.tsx` pour le style.
- **Toute la ligne est cliquable** pour déplier ; le lien Maps et les boutons appellent `e.stopPropagation()`.

- [ ] **Step 3 : Structurer le dépliement**

Rendu uniquement quand `expanded`, dans `ml-9 mt-3 space-y-3 border-l border-[rgba(245,245,245,0.08)] pl-4`. Il ne montre **que** les intervenants et les titres — le reste vit dans la modale.

```
│ Intervenants                                              │
│  Camille Roy — Ingé Mixage                                │
│  Théo Bak — Musicien interprète                           │
│ Titres travaillés                                         │
│  ▣ Nuit blanche          FR-XXX-25-00001                  │
│  ▣ Sables                ⚠ ISRC manquant                  │
```

- Intitulés de sous-section en `text-[11px] uppercase tracking-wide text-[#F5F5F5]/35`.
- Intervenants : nom en `text-sm text-[#F5F5F5]`, `roleLabel(p.role)` en `text-xs text-[#F5F5F5]/45`. Un intervenant avec `contactId` porte une icône `User` de 12 px en `#F5F5F5`/45 avec `title="Contact enregistré"` — le lien avec le carnet d'adresses doit se voir.
- Titres : résolus par `sessionTracks(session, tracks)`, chacun avec sa cover 24×24 `rounded` ou un carré `bg-[rgba(245,245,245,0.06)]` avec `Music`, le titre, puis l'ISRC en `font-mono text-xs tabular-nums` ; ISRC vide → `⚠ ISRC manquant` en `#F59E0B` avec `AlertTriangle` 12 px.
- Sections vides : « Aucun intervenant renseigné. » / « Aucun titre rattaché. » en `text-xs text-[#F5F5F5]/35`. Ne pas masquer la section : c'est justement le trou qu'on veut voir.
- Note de session, si présente : dernière sous-section « Notes », `text-xs text-[#F5F5F5]/55 whitespace-pre-wrap`.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npx eslint src/modules/phono/components/sessions/SessionRow.tsx
```

---

## Task 7 : Réécriture de `SessionsStudioPage` en orchestration

**Files:**
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

- [ ] **Step 1 : Poser la structure**

Le fichier ne garde de son état actuel que le dialog de formulaire et le dialog de suppression, inchangés, le temps de la phase 2. Tout le reste — `tableHeaders`, `renderRow`, les deux `Card` repliables, `openSection`, `toggleSection`, `SESSION_TYPES`, `PARTICIPANT_ROLES`, `sessionTypeLabel`, `participantRoleLabel`, `normalizeParticipantRole`, `buildGoogleMapsUrl` — est supprimé.

Nouvelle structure de rendu :

```
div.space-y-6
  ├ en-tête de page (titre + description + bouton « Session »)
  ├ SessionsHeader
  ├ barre d'outils : recherche · Type ▾ · Période ▾
  ├ section « À venir · {n} »   → SessionRow[]
  ├ section « Passées · {n} »   → SessionRow[]
  ├ Dialog de formulaire (ancien, provisoire)
  └ Dialog de suppression
```

État local : `search`, `filter: SessionFilter`, `period`, `expandedId: string | null`, `editingId`, `deleteConfirmId`, plus l'état `form` de l'ancien dialog.

- [ ] **Step 2 : Filtrage, tri et sections**

```ts
type SessionPeriod = "all" | "12m" | "year" | "upcoming";

// Recherche insensible à la casse ET aux accents, des deux côtés.
const fold = (v: string) =>
  v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
```

La recherche porte sur : titre, lieu, adresse, nom des intervenants, et titre des morceaux rattachés (résolus via `sessionTracks`). Le filtre `SessionFilter` s'applique ensuite :

- `{ kind: "type" }` → `s.sessionType === filter.type` ;
- `{ kind: "missing-participants" }` → `isSessionPast(s) && s.participants.length === 0` ;
- `{ kind: "missing-tracks" }` → `isSessionPast(s) && s.trackIds.length === 0`.

La période filtre sur `s.date` : `12m` → `>= monthsAgoIso(12)`, `year` → commence par l'année courante, `upcoming` → `!isSessionPast(s)`.

Les deux sections sont **triées en sens inverse** :

```ts
// À venir : la prochaine d'abord. Passées : la plus récente d'abord.
const upcoming = filtered.filter((s) => !isSessionPast(s)).sort((a, b) => a.date.localeCompare(b.date));
const past = filtered.filter((s) => isSessionPast(s)).sort((a, b) => b.date.localeCompare(a.date));
```

Une session sans date n'est pas « passée » (`isSessionPast` renvoie `false` sur une date vide) : elle apparaît donc dans « À venir », en tête, avec sa mention « Date non renseignée ». C'est voulu — une donnée incomplète doit se voir, pas se cacher au fond de l'historique.

En-têtes de section : `text-[11px] uppercase tracking-wide text-[#F5F5F5]/35`, suivis du compte. Une section vide est simplement omise, sauf quand les deux le sont — cas traité à l'étape 3.

- [ ] **Step 3 : États**

- `PageLoader` pendant le chargement et `PageError` avec `onRetry={() => mutate("user_phono")}` : comportement actuel, conservé.
- `EmptyState` quand `sessions.length === 0`, icône `AudioWaveform`, action « Planifier une session ». **Réécrire la description** : la formulation actuelle promet des fonctions qui n'existaient pas. Nouveau texte : *« Garde la trace de tes séances : qui a joué, sur quels titres, dans quel studio, pour combien. C'est ce registre qui sert tes déclarations de droits voisins. »* — désormais exact.
- `NoResult` avec `query`, `hasFilters` et `onReset` quand `sessions.length > 0` mais que les deux sections sont vides. `onReset` remet `search` à `""`, `filter` à `{ kind: "none" }` et `period` à `"all"`.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run build
npx eslint src/modules/phono/components/SessionsStudioPage.tsx
wc -l src/modules/phono/components/SessionsStudioPage.tsx
```
Attendu : moins de 400 lignes à ce stade (l'ancien formulaire pèse encore ~200 lignes ; il part à la tâche 10).

Parcours dev sur `/phono/sessions-studio` :

1. Le bandeau affiche un total cohérent avec le nombre de sessions des douze derniers mois.
2. La barre segmentée montre une couleur par type présent, aucune pour un type absent.
3. Cliquer « Mix » dans la légende → seules les sessions de type Mix restent ; recliquer annule.
4. Cliquer une chip ⚠ → seules les sessions passées concernées restent.
5. Déplier une session ayant des participants → les rôles s'affichent, ce qui n'était jamais arrivé.
6. Rechercher le nom d'un intervenant → la session remonte.
7. Rechercher « sesion » (faute) → `NoResult` avec le bouton de réinitialisation, qui fonctionne.
8. Une session à venir est listée avant les passées, la plus proche en premier.
9. Créer une session avec l'ancien formulaire → elle apparaît dans la bonne section.

- [ ] **Step 5 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/components/sessions/ src/modules/phono/components/SessionsStudioPage.tsx
git commit -m "feat(phono): vue de lecture des sessions studio

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — Édition

## Task 8 : `SessionParticipantsField`

**Files:**
- Create: `src/modules/phono/components/sessions/SessionParticipantsField.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
import type { SessionParticipant } from "@/lib/sidekick-store";

export interface SessionParticipantsFieldProps {
  participants: SessionParticipant[];
  /** Noms déjà employés dans d'autres sessions, via `knownParticipantNames`. */
  knownNames: string[];
  onChange: (participants: SessionParticipant[]) => void;
}
```

Le composant appelle lui-même `useContactsData()` pour la liste des contacts ; `knownNames` lui est passé parce qu'il vient des sessions, que ce composant ne connaît pas.

- [ ] **Step 2 : Structure**

```
Intervenants
  [Nom…]                          [Rôle ▾]              ×
    ↳ Camille Roy · Théo Bak · Studio Bleu   (suggestions)
  + Ajouter un intervenant
```

- Une ligne par intervenant : `Input` du nom sur `basis-1/2`, `Select` de rôle sur `basis-1/2` alimenté par `ROLES` de `@/modules/phono/lib/track`, bouton de suppression `Trash2` en `h-9 w-9 shrink-0 text-[#F5F5F5]/40 hover:text-red-400`.
- **Suggestions** : sous le champ de nom actif, quand il contient au moins deux caractères, jusqu'à cinq propositions cliquables. Source : les contacts (`{firstName} {lastName}`, dédoublonnés) puis `knownNames`. Rendu en chips `rounded-full border border-[rgba(245,245,245,0.12)] px-2 py-0.5 text-[11px] text-[#F5F5F5]/70 hover:border-[#F0FF00]`. Pas de `Popover`, pas de `datalist` : une rangée de boutons suffit et se style comme le reste.
- Cliquer une suggestion issue d'un contact renseigne `name` **et** `contactId` ; une saisie libre laisse `contactId` à `undefined`. Modifier le nom à la main après coup efface `contactId` — le lien ne doit pas survivre à un nom qui ne correspond plus.
- « + Ajouter un intervenant » crée `{ id: newParticipantId(), name: "", role: "artiste_principal" }`. Les entrées au nom vide sont écartées à la soumission par `normalizeSessionParticipants`, appelée par le dialog.
- Vide : « Aucun intervenant. » en `text-xs text-[#F5F5F5]/35`, dans le conteneur `rounded-lg border border-[rgba(245,245,245,0.08)] p-2`.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npx eslint src/modules/phono/components/sessions/SessionParticipantsField.tsx
```

---

## Task 9 : `SessionTracksField`

**Files:**
- Create: `src/modules/phono/components/sessions/SessionTracksField.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
import type { Track } from "@/lib/sidekick-store";

export interface SessionTracksFieldProps {
  trackIds: string[];
  allTracks: Track[];
  onChange: (trackIds: string[]) => void;
}
```

- [ ] **Step 2 : Structure**

Deux zones empilées, même idiome que le `TracklistComposer` du plan Catalogue — sans drag & drop : l'ordre des titres travaillés pendant une séance n'a aucune signification, et une poignée de réordonnancement suggérerait le contraire.

**Titres retenus** — une ligne par titre : cover 24×24 ou carré `bg-[rgba(245,245,245,0.06)]` avec `Music`, titre, artiste principal en `text-xs text-[#F5F5F5]/45`, ISRC en `font-mono text-xs`, bouton `X` de retrait. Vide : « Aucun titre rattaché. Ajoute-les depuis le catalogue ci-dessous. »

**Catalogue** — `Input` de recherche (même normalisation d'accents que la page), puis les titres non déjà retenus, vingt au maximum, chacun avec un bouton `Plus` qui l'ajoute en fin de liste. Recherche vide : afficher les vingt titres les plus récents plutôt qu'une zone vide.

`onChange` reçoit toujours le tableau complet. Un `trackId` orphelin présent en entrée est conservé tel quel dans le tableau tant que l'utilisateur ne touche à rien, et disparaît dès qu'il modifie la sélection — c'est `onChange` qui reconstruit à partir des titres résolus.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npx eslint src/modules/phono/components/sessions/SessionTracksField.tsx
```

---

## Task 10 : `SessionDialog` et retrait de l'ancien formulaire

**Files:**
- Create: `src/modules/phono/components/sessions/SessionDialog.tsx`
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
import type { StudioSession, Track } from "@/lib/sidekick-store";

export interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. Le mode se déduit d'ici, pas d'un booléen séparé. */
  session: StudioSession | null;
  tracks: Track[];
  /** Noms d'intervenants connus, pour les suggestions. */
  knownNames: string[];
  /** Reçoit une session complète et normalisée, prête à écrire. */
  onSubmit: (session: StudioSession) => void;
}
```

- [ ] **Step 2 : Contenu**

`DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"`, quatre blocs séparés par `border-t border-[rgba(245,245,245,0.08)] pt-4`.

**Quand & où** — `Select` de type (`SESSION_TYPES`), champ libre révélé si `autre` ; Titre ; `DatePicker` de date ; deux `Input type="time"` début et fin ; Studio ; Adresse.

**Intervenants** — `SessionParticipantsField`.

**Titres travaillés** — `SessionTracksField`.

**Coût & notes** — `Input` de coût (`inputMode="decimal"`, suffixe « € »), `Textarea` de notes.

- [ ] **Step 3 : Règles de saisie**

Ce sont elles qui corrigent le défaut central du fichier actuel : **plus aucune valeur n'est inventée**.

```ts
// La date est le seul champ obligatoire : sans elle, la session n'a pas de
// place dans le registre. L'ancien saveSession la remplaçait par la date du
// jour et l'heure par 14:00, ce qui produisait des séances fictives.
const canSubmit = /^\d{4}-\d{2}-\d{2}$/.test(form.date);
```

- Bouton de soumission désactivé tant que `canSubmit` est faux, avec sous le champ de date : « La date est nécessaire pour classer la session. »
- Titre, heures, lieu, coût, notes : tous facultatifs, tous enregistrés vides s'ils le sont.
- La durée s'affiche sous les champs d'heure dès que début et fin sont renseignés, via `sessionDurationMinutes` et `formatDurationMinutes`. Si `sessionCrossesMidnight` est vrai, ajouter « la session se termine le lendemain » en `text-xs text-[#F5F5F5]/45`.
- À la soumission, construire l'objet puis le passer dans `normalizeSession` : intervenants sans nom écartés, coût parsé par `parseCostInput`, chaînes vides converties en `undefined` là où le type l'attend.
- À la création, `id: newSessionId()`.

- [ ] **Step 4 : Brancher et nettoyer**

Dans `SessionsStudioPage.tsx` :

```ts
const knownNames = useMemo(() => knownParticipantNames(sessions), [sessions]);

const submitSession = (session: StudioSession) => {
  setSessions((prev) =>
    prev.some((s) => s.id === session.id)
      ? prev.map((s) => (s.id === session.id ? session : s))
      : [session, ...prev]
  );
  if (!sessions.some((s) => s.id === session.id)) {
    posthog?.capture("item_created", { module: "phono" });
  }
  setDialogOpen(false);
};

// Dupliquer : lieu, type et intervenants sont repris — une série de séances au
// même studio avec la même équipe est le cas normal. La date et les titres ne
// le sont pas : ce sont eux qui distinguent deux séances.
const duplicateSession = (session: StudioSession) => {
  setSessions((prev) => [
    {
      ...session,
      id: newSessionId(),
      date: "",
      trackIds: [],
      participants: session.participants.map((p) => ({ ...p, id: newParticipantId() })),
    },
    ...prev,
  ]);
};
```

Supprimer alors de `SessionsStudioPage.tsx` : l'état `form`, `openAdd`, `openEdit`, `saveSession`, `addParticipant`, `updateParticipant`, `removeParticipant`, et tout le JSX de l'ancien `Dialog` de formulaire (l. 475-660 du fichier d'origine). Le dialog de suppression est conservé, mais son texte devient : « Supprimer cette session ? » suivi de « Cette action est irréversible. » et, si `session.trackIds.length > 0`, de « {n} titre(s) rattaché(s) perdront ce rattachement. Les titres eux-mêmes ne sont pas supprimés. »

- [ ] **Step 5 : Vérifier**

```bash
npx tsc --noEmit && npm run build
npx eslint src/modules/phono/components/sessions/ src/modules/phono/components/SessionsStudioPage.tsx
wc -l src/modules/phono/components/SessionsStudioPage.tsx
```
Attendu : moins de 200 lignes.

Parcours dev :

1. Créer une session sans rien remplir → le bouton d'enregistrement est désactivé, le message sur la date s'affiche.
2. Renseigner la seule date → l'enregistrement passe ; la ligne affiche le type et le lieu à la place du titre.
3. Renseigner 22:00 → 03:00 → la durée affiche « 5 h » et la mention « se termine le lendemain ».
4. Ajouter un intervenant en tapant les trois premières lettres d'un contact → la suggestion apparaît, la cliquer remplit le nom.
5. Rattacher deux titres du catalogue, enregistrer, déplier la ligne → les deux titres et leurs ISRC s'affichent.
6. Recharger la page → tout est persisté ; dans Supabase, `track_ids` contient les deux ids et `cost` le montant.
7. Dupliquer une session → copie sans date ni titres, intervenants conservés avec de nouveaux ids.
8. Supprimer une session ayant des titres rattachés → la confirmation le mentionne ; après suppression, les titres existent toujours dans le catalogue.

- [ ] **Step 6 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/components/sessions/ src/modules/phono/components/SessionsStudioPage.tsx
git commit -m "feat(phono): formulaire de session unique, intervenants et titres rattachés

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — Diffusion et liens

## Task 11 : `SessionSheetDialog`

**Files:**
- Create: `src/modules/phono/components/sessions/SessionSheetDialog.tsx`
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
import type { StudioSession, Track } from "@/lib/sidekick-store";

export interface SessionSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` quand aucune session n'est ciblée : le dialog ne rend rien. */
  session: StudioSession | null;
  tracks: Track[];
}
```

- [ ] **Step 2 : Contenu**

`DialogContent className="sm:max-w-lg"`, titre « Feuille de session ».

- Le corps est le résultat de `formatSessionSheet(session, tracks)` rendu dans un
  `<pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(16,16,16,0.6)] p-4 font-mono text-xs text-[#F5F5F5]/85">`.
  Le texte reste sélectionnable : c'est le recours si la copie échoue.
- Bouton « Copier » (icône `Copy`) en action principale. Succès : l'icône passe à `Check` pendant deux secondes et `toast.success("Feuille de session copiée.")`.
- Échec de `navigator.clipboard` — le cas se produit hors contexte sécurisé : `toast.error("Copie impossible. Sélectionne le texte pour le copier à la main.")`. Ne pas masquer l'erreur, le texte affiché est le plan de repli.
- Sous le bouton, une ligne d'explication en `text-xs text-[#F5F5F5]/45` : « À coller dans un mail, un dossier SPEDIDAM ou un échange avec un producteur. »

- [ ] **Step 3 : Brancher**

Dans `SessionsStudioPage.tsx`, un état `sheetSessionId: string | null` piloté par `onOpenSheet` de `SessionRow`, et le dialog monté en fin de rendu avec `session={sessions.find((s) => s.id === sheetSessionId) ?? null}`.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run build
npx eslint src/modules/phono/components/sessions/SessionSheetDialog.tsx src/modules/phono/components/SessionsStudioPage.tsx
```

Parcours dev :

1. Ouvrir la feuille d'une session complète → date, horaires, durée, studio, titres avec ISRC, intervenants avec rôles.
2. Ouvrir celle d'une session sans titre ni intervenant → les sections correspondantes sont absentes, aucune ligne vide.
3. Un titre sans ISRC affiche « ISRC non attribué ».
4. Cliquer « Copier », coller dans un éditeur → le texte est identique à l'affichage, retours à la ligne compris.

---

## Task 12 : Liens Projets ↔ Sessions, et recette

**Files:**
- Modify: `src/modules/projects/components/sections/PhonoSection.tsx`
- Modify: `src/modules/projects/components/tabs/CreationTab.tsx:365-371`

- [ ] **Step 1 : Rebrancher `PhonoSection` sur Supabase**

`PhonoSection.tsx` lit ses albums, titres et sessions dans `data.phono` via `useSidekickData`, c'est-à-dire le **localStorage**, alors que les trois sont en Supabase depuis la migration. La liste des sessions liables est donc vide et les sessions liées ne s'affichent pas : le seul lien Projet ↔ Session de l'app est inopérant.

Ajouter l'import et l'appel :

```ts
import { usePhonoData } from "@/hooks/usePhonoData";

// dans le composant, à côté de useSidekickData :
const { albums, tracks, sessions } = usePhonoData();
```

Puis remplacer les six lectures (l. 34-40) :

```ts
const linkedAlbums = albums.filter((a) => project.linkedAlbums.includes(a.id));
const linkedTracks = tracks.filter((t) => project.linkedTracks.includes(t.id));
const linkedSessions = sessions.filter((s) => project.linkedSessions.includes(s.id));

const availableAlbums = albums.filter((a) => !project.linkedAlbums.includes(a.id));
const availableTracks = tracks.filter((t) => !project.linkedTracks.includes(t.id));
const availableSessions = sessions.filter((s) => !project.linkedSessions.includes(s.id));
```

`useSidekickData` reste utilisé dans ce fichier pour `setData` : les liens du projet, eux, vivent toujours dans `data.projects`, encore en localStorage. Ne pas y toucher.

Vérifier l'affichage d'une session dans ce composant : s'il montrait une date, elle est désormais en ISO — la passer par `toDisplayDate` de `@/lib/date-format`.

- [ ] **Step 2 : Rebrancher les deux lignes phono de `CreationTab`**

Même hook, deux lignes de `signalCtx` (l. 365-366) :

```ts
tracks: tracks.filter((t) => project.linkedTracks.includes(t.id)),
sessions: sessions.filter((s) => project.linkedSessions.includes(s.id)),
```

avec `const { tracks, sessions } = usePhonoData();` en tête de composant, et `tracks, sessions` substitués à `data.phono` dans le tableau de dépendances du `useMemo`.

> **Limite assumée, à signaler à l'utilisateur sans agir :** les lectures `data.edition.works`, `data.live.tourDates` et `data.live.rehearsals` du même `signalCtx` souffrent exactement du même défaut — elles interrogent le localStorage pour des données passées en Supabase. Elles ne sont **pas** corrigées ici : elles appartiennent au chantier Projets et demandent `useEditionData` et `useLiveData`, hors périmètre de cette refonte.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run build
npx eslint src/modules/projects/components/sections/PhonoSection.tsx src/modules/projects/components/tabs/CreationTab.tsx
```

- [ ] **Step 4 : Recette complète**

Vérifier qu'aucun reliquat ne subsiste :

```bash
grep -n "muted-foreground\|bg-muted\|text-destructive\|border-b\b" src/modules/phono/components/SessionsStudioPage.tsx src/modules/phono/components/sessions/*.tsx
grep -rn "parseFrDate\|PARTICIPANT_ROLES\|ParticipantEntry" src/ app/
wc -l src/modules/phono/components/SessionsStudioPage.tsx
```
Attendu : aucune ligne pour les deux `grep`, moins de 200 lignes pour le fichier.

Puis, en dev, dérouler la recette de la spec :

1. Une session historique en `JJ/MM/AAAA` (en fabriquer une dans Supabase si nécessaire) s'affiche, s'édite et se ré-enregistre en ISO, à la bonne date, sans décalage d'un jour.
2. Les sessions apparaissent dans l'ordre chronologique attendu dans chaque section, y compris de part et d'autre du 1er janvier.
3. Une session dont les participants ont encore un `id` numérique et le rôle `musicien` (à fabriquer dans Supabase) s'affiche « Musicien interprète » et se ré-enregistre avec des ids `sp-…`.
4. Le total d'heures du bandeau ignore les sessions sans heure de fin et l'annonce dans sa sous-ligne.
5. Une session 22:00 → 03:00 affiche une durée de 5 h, partout où la durée apparaît.
6. `/calendrier` et le dashboard montrent toujours les sessions, aux mêmes dates.
7. Lier une session à un projet depuis l'onglet Phono d'un projet → la session apparaît dans la liste liable, puis dans les liées, et survit à un rechargement.
8. Un compte vierge affiche l'`EmptyState`, dont la description ne promet plus que ce que la page fait.
9. Le catalogue et la page Liens d'écoute se chargent sans régression : aucun champ dont ils dépendent n'a bougé.

- [ ] **Step 5 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/ src/modules/projects/ src/hooks/usePhonoData.ts src/lib/sidekick-store.ts supabase/migrations/
git commit -m "feat(phono): feuille de session et lien Projets rebranché sur Supabase

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Reste à faire, hors de ce plan

- **Affichage des sessions dans la fiche d'un titre.** Le lien est unidirectionnel : une session connaît ses titres, un titre ignore ses sessions. La réciproque suppose de toucher `TrackRow` et `TrackDialog`, figés par le plan Catalogue en cours. Elle coûtera peu une fois celui-ci livré, puisque la donnée existera.
- **Lectures Édition et Live de Projects** encore branchées sur le localStorage (`CreationTab.tsx`, `signalCtx`). Signalées à la tâche 12, non corrigées : chantier Projets.
- **Suivi de dépenses.** `cost` est un montant unique, sans échéance ni statut de paiement. Un vrai suivi appartiendrait à un module de dépenses que Revenus ne possède pas.
- **Règle de suggestion de tâche** du type « ta session du 12 septembre n'a aucun intervenant renseigné ». `src/modules/tasks/rules/phono.ts` existe et le `RuleContext` pourrait recevoir les sessions. Volontairement écarté de ce plan : la donnée qui rendrait la règle utile (`participants`, `trackIds`) vient tout juste d'exister, et une règle écrite avant d'avoir observé le remplissage réel produirait du bruit.

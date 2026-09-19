"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ChevronDown,
  Clock3,
  Disc3,
  Euro,
  FileText,
  Plus,
  Printer,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/ui/page-loader";
import { useContactsData } from "@/hooks/useContactsData";
import {
  usePhonoData,
  type SessionParticipant,
  type SessionProducer,
  type StudioSession,
} from "@/hooks/usePhonoData";
import { isoToFr, toDisplayDate, toIsoDatePickerValue } from "@/lib/date-format";
import { cn, focusRing } from "@/lib/utils";
import {
  SESSION_TYPES,
  SESSION_TYPE_COLOR,
  formatDuration,
  linkedCount,
  sessionCost,
  sessionDurationMinutes,
} from "@/modules/phono/lib/session";

const ROLES = [
  "Artiste principal",
  "Artiste secondaire",
  "Musicien interprète",
  "Chanteur interprète",
  "Beatmaker",
  "Réalisateur",
  "Ingénieur du son",
  "Autre",
];

const EMPTY_PRODUCER: SessionProducer = {
  name: "",
  legalName: "",
  label: "",
  address: "",
  siret: "",
  email: "",
  phone: "",
};

const PRODUCER_FIELDS = [
  ["name", "Nom du producteur"],
  ["legalName", "Raison sociale"],
  ["label", "Label"],
  ["siret", "SIRET"],
  ["email", "Email"],
  ["phone", "Téléphone"],
  ["address", "Adresse"],
] as const;

function emptySession(previous?: StudioSession): StudioSession {
  return {
    id: crypto.randomUUID(),
    title: "",
    date: "",
    time: "10:00",
    endTime: "18:00",
    location: "",
    address: "",
    sessionType: "prise",
    participants: [],
    status: "planned",
    albumIds: [],
    trackIds: [],
    mixIds: [],
    studioCost: 0,
    otherCosts: 0,
    presenceEnabled: false,
    producer: previous?.producer ?? EMPTY_PRODUCER,
    note: "",
  };
}

/**
 * En-tête de section du formulaire : icône teintée, titre, sous-titre
 * facultatif et action alignée à droite. Donne au corps de la page la
 * hiérarchie que des cartes de même poids ne produisaient pas.
 */
function Section({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.45)] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(240,255,0,0.08)]">
            <Icon size={15} className="text-[#F0FF00]/70" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-[#F5F5F5]/40">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Liste à cocher d'une famille du catalogue. Hauteur minimale commune aux trois
 * colonnes : sans elle, albums, titres et mixes se terminaient à trois hauteurs
 * différentes selon leur nombre d'éléments.
 */
function CheckList({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const count = selected.length;
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        {count > 0 && (
          <span className="text-[10px] tabular-nums text-[#F0FF00]/70">
            {count} sélectionné{count > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="mt-2 max-h-44 min-h-[7rem] space-y-1 overflow-y-auto rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.02)] p-2">
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[#F5F5F5]/30">
            Aucun élément dans le catalogue
          </p>
        ) : (
          items.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                  checked
                    ? "bg-[rgba(240,255,0,0.06)] text-[#F5F5F5]"
                    : "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.04)]"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    onChange(
                      value
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id)
                    )
                  }
                />
                <span className="truncate">{item.label}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SessionEditPage({ sessionId }: { sessionId: string | null }) {
  const router = useRouter();
  const phono = usePhonoData();
  const contactsData = useContactsData();

  const existing = sessionId
    ? phono.sessions.find((s) => s.id === sessionId)
    : undefined;
  const latestProducer = [...phono.sessions].find((s) =>
    Object.values(s.producer ?? {}).some(Boolean)
  );

  const [form, setForm] = useState<StudioSession | null>(null);
  const [advanced, setAdvanced] = useState(existing?.presenceEnabled ?? false);

  const value =
    form ??
    (existing
      ? { ...existing, participants: existing.participants.map((p) => ({ ...p })) }
      : emptySession(latestProducer));
  const set = (patch: Partial<StudioSession>) => setForm({ ...value, ...patch });
  const linkedTracks = useMemo(
    () => new Set(value.trackIds ?? []),
    [value.trackIds]
  );

  if (phono.loading || contactsData.loading) return <PageLoader />;
  if (sessionId && !existing)
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-[#F5F5F5]/50">Cette session est introuvable.</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => router.push("/phono/sessions-studio")}
        >
          Retour
        </Button>
      </div>
    );

  const save = () => {
    const payload = {
      ...value,
      title: value.title.trim(),
      date: value.date ? isoToFr(value.date) : "",
      presenceEnabled: advanced,
    };
    phono.setSessions((prev) =>
      sessionId
        ? prev.map((s) => (s.id === sessionId ? payload : s))
        : [payload, ...prev]
    );
    router.push("/phono/sessions-studio");
  };

  const addContact = (contactId: string) => {
    const c = contactsData.contacts.find((item) => item.id === contactId);
    if (!c || value.participants.some((p) => p.contactId === c.id)) return;
    set({
      participants: [
        ...value.participants,
        {
          id: crypto.randomUUID(),
          contactId: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          role: c.role || "Musicien interprète",
          email: c.email,
          phone: c.phone,
          isPerformer: true,
          trackIds: [],
        },
      ],
    });
  };

  const addFree = () =>
    set({
      participants: [
        ...value.participants,
        {
          id: crypto.randomUUID(),
          name: "",
          role: "Musicien interprète",
          isPerformer: true,
          trackIds: [],
        },
      ],
    });

  const patchParticipant = (
    id: string | number,
    patch: Partial<SessionParticipant>
  ) =>
    set({
      participants: value.participants.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    });

  const createContactFromParticipant = (participant: SessionParticipant) => {
    const parts = participant.name.trim().split(/\s+/);
    const id = crypto.randomUUID();
    contactsData.setContacts((prev) => [
      ...prev,
      {
        id,
        firstName: parts.shift() ?? "",
        lastName: parts.join(" "),
        role: participant.role,
        city: "",
        email: participant.email ?? "",
        instagram: "",
        phone: participant.phone ?? "",
        notes: "Ajouté depuis une session studio",
        createdAt: new Date().toISOString(),
      },
    ]);
    patchParticipant(participant.id, { contactId: id });
  };

  const canSave = value.title.trim() !== "" && value.date !== "";
  // Un formulaire vierge n'a encore rien manqué : la liste des manques
  // n'apparaît qu'une fois la première saisie faite, ou d'emblée en édition.
  const touched = form !== null || sessionId !== null;
  const unsavedContacts = value.participants.filter(
    (p) => !p.contactId && p.name.trim()
  );

  return (
    <div className="pb-24 print:p-0">
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => router.push("/phono/sessions-studio")}
          className={cn(
            "mb-4 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-[#F5F5F5]/70 transition-colors hover:text-[#F5F5F5]",
            focusRing
          )}
        >
          <ArrowLeft size={14} />
          Retour aux sessions studio
        </button>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
              Phono · Sessions studio
            </p>
            <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
              {sessionId
                ? value.title || "Session sans titre"
                : "Planifier une session"}
            </h1>
          </div>
          {sessionId && advanced && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={15} />
              Imprimer la fiche
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] print:hidden">
        <div className="space-y-5">
          <Section icon={SlidersHorizontal} title="La session">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="session-title">Titre</Label>
                <Input
                  id="session-title"
                  className="mt-2"
                  value={value.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Session voix, nouvel EP"
                />
              </div>

              {/*
                Le type en boutons plutôt qu'en liste déroulante : il n'y a que
                cinq valeurs, elles portent chacune une couleur reprise par la
                liste et le bandeau, et c'est le premier choix de la page.
              */}
              <div className="sm:col-span-2">
                <Label>Type de session</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SESSION_TYPES.map(({ value: type, label }) => {
                    const active = value.sessionType === type;
                    const color = SESSION_TYPE_COLOR[type]!;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set({ sessionType: type })}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                          focusRing,
                          active
                            ? "text-[#F5F5F5]"
                            : "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/50 hover:text-[#F5F5F5]/80"
                        )}
                        style={
                          active
                            ? {
                                borderColor: `${color}66`,
                                background: `${color}1a`,
                              }
                            : undefined
                        }
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: color,
                            boxShadow: active ? `0 0 8px ${color}88` : undefined,
                            opacity: active ? 1 : 0.5,
                          }}
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {value.sessionType === "autre" && (
                  <Input
                    className="mt-2"
                    value={value.sessionTypeOther ?? ""}
                    onChange={(e) => set({ sessionTypeOther: e.target.value })}
                    placeholder="Préciser le type de session"
                  />
                )}
              </div>

              <div>
                <Label>Statut</Label>
                <Select
                  value={value.status ?? "planned"}
                  onValueChange={(v: StudioSession["status"]) =>
                    set({ status: v })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planifiée</SelectItem>
                    <SelectItem value="completed">Terminée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <DatePicker
                  value={value.date ? toIsoDatePickerValue(value.date) : ""}
                  onChange={(date) => set({ date })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Début</Label>
                  <Input
                    className="mt-2"
                    type="time"
                    value={value.time}
                    onChange={(e) => set({ time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input
                    className="mt-2"
                    type="time"
                    value={value.endTime ?? ""}
                    onChange={(e) => set({ endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Studio</Label>
                <Input
                  className="mt-2"
                  value={value.location}
                  onChange={(e) => set({ location: e.target.value })}
                  placeholder="Nom du studio"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input
                  className="mt-2"
                  value={value.address ?? ""}
                  onChange={(e) => set({ address: e.target.value })}
                  placeholder="Adresse complète"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={Disc3}
            title="Catalogue lié"
            description="Ce qui a été travaillé pendant la session. Les coûts remontent vers les projets qui partagent ces éléments."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <CheckList
                title="Albums & EP"
                items={phono.albums.map((a) => ({ id: a.id, label: a.title }))}
                selected={value.albumIds ?? []}
                onChange={(albumIds) => set({ albumIds })}
              />
              <CheckList
                title="Titres"
                items={phono.tracks.map((t) => ({ id: t.id, label: t.title }))}
                selected={value.trackIds ?? []}
                onChange={(trackIds) => set({ trackIds })}
              />
              <CheckList
                title="Mixes"
                items={phono.mixes.map((m) => ({ id: m.id, label: m.title }))}
                selected={value.mixIds ?? []}
                onChange={(mixIds) => set({ mixIds })}
              />
            </div>
          </Section>

          <Section
            icon={Users}
            title="Participants"
            description="Ajoute un contact existant ou une personne ponctuelle."
            action={
              <Button size="sm" variant="outline" onClick={addFree}>
                <Plus size={14} />
                Saisie libre
              </Button>
            }
          >
            <Select onValueChange={addContact}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter depuis Contacts…" />
              </SelectTrigger>
              <SelectContent>
                {contactsData.contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {value.participants.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-[rgba(245,245,245,0.1)] py-6 text-center text-xs text-[#F5F5F5]/30">
                Personne pour l&apos;instant. Les participants déclarés
                alimentent la fiche de présence.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {value.participants.map((p) => (
                  <div
                    key={p.id}
                    className="grid gap-2 rounded-lg border border-[rgba(245,245,245,0.07)] bg-[rgba(245,245,245,0.02)] p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <Input
                      value={p.name}
                      onChange={(e) =>
                        patchParticipant(p.id, { name: e.target.value })
                      }
                      placeholder="Nom et prénom"
                    />
                    <Select
                      value={p.role}
                      onValueChange={(role) => patchParticipant(p.id, { role })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Retirer le participant"
                      onClick={() =>
                        set({
                          participants: value.participants.filter(
                            (item) => item.id !== p.id
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </Button>

                    {advanced && (
                      <>
                        <Input
                          value={p.instrument ?? ""}
                          onChange={(e) =>
                            patchParticipant(p.id, {
                              instrument: e.target.value,
                            })
                          }
                          placeholder="Instrument / fonction"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="time"
                            value={p.arrivalTime ?? value.time}
                            onChange={(e) =>
                              patchParticipant(p.id, {
                                arrivalTime: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="time"
                            value={p.departureTime ?? value.endTime}
                            onChange={(e) =>
                              patchParticipant(p.id, {
                                departureTime: e.target.value,
                              })
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-[#F5F5F5]/55">
                          <Checkbox
                            checked={p.isPerformer !== false}
                            onCheckedChange={(checked) =>
                              patchParticipant(p.id, {
                                isPerformer: Boolean(checked),
                              })
                            }
                          />
                          Artiste-interprète
                        </label>
                        <div className="sm:col-span-3">
                          <p className="mb-2 text-[10px] uppercase tracking-wider text-[#F5F5F5]/35">
                            Titres interprétés
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {phono.tracks
                              .filter((t) => linkedTracks.has(t.id))
                              .map((t) => (
                                <label
                                  key={t.id}
                                  className="flex items-center gap-2 rounded-md border border-[rgba(245,245,245,0.08)] px-2 py-1 text-xs text-[#F5F5F5]/60"
                                >
                                  <Checkbox
                                    checked={(p.trackIds ?? []).includes(t.id)}
                                    onCheckedChange={(checked) =>
                                      patchParticipant(p.id, {
                                        trackIds: checked
                                          ? [...(p.trackIds ?? []), t.id]
                                          : (p.trackIds ?? []).filter(
                                              (id) => id !== t.id
                                            ),
                                      })
                                    }
                                  />
                                  {t.title}
                                </label>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {unsavedContacts.length > 0 && (
            <section className="rounded-xl border border-[rgba(240,255,0,0.15)] bg-[#F0FF00]/[0.03] p-4">
              <p className="text-xs font-medium text-[#F5F5F5]/70">
                Ajouter aux Contacts
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unsavedContacts.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="outline"
                    onClick={() => createContactFromParticipant(p)}
                  >
                    <Plus size={13} />
                    {p.name}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </div>

        <SessionEditAside
          session={value}
          presenceEnabled={advanced}
          canSave={canSave}
          showMissing={touched}
          onPatch={set}
          onSave={save}
          onCancel={() => router.push("/phono/sessions-studio")}
          isEdit={sessionId !== null}
        />
      </div>

      <section className="mt-5 rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.45)] print:hidden">
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          aria-expanded={advanced}
          className={cn(
            "flex w-full items-center justify-between rounded-xl p-5 text-left",
            focusRing
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(240,255,0,0.08)]">
              <FileText size={15} className="text-[#F0FF00]/70" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Fiche de présence
              </h2>
              <p className="mt-0.5 text-xs text-[#F5F5F5]/40">
                Informations avancées pour préparer les déclarations de droits
                voisins.
              </p>
            </div>
          </div>
          <ChevronDown
            size={17}
            className={cn(
              "text-[#F5F5F5]/50 transition-transform",
              advanced && "rotate-180"
            )}
          />
        </button>
        {advanced && (
          <div className="border-t border-[rgba(245,245,245,0.08)] p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCER_FIELDS.map(([key, label]) => (
                <div
                  key={key}
                  className={
                    key === "address" ? "sm:col-span-2 lg:col-span-3" : ""
                  }
                >
                  <Label>{label}</Label>
                  <Input
                    className="mt-2"
                    value={value.producer?.[key] ?? ""}
                    onChange={(e) =>
                      set({
                        producer: {
                          ...(value.producer ?? EMPTY_PRODUCER),
                          [key]: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[#F5F5F5]/35">
              Ces informations seront proposées lors de la prochaine création de
              session. La signature numérique est prévue avec le chantier
              Contrats en bêta.
            </p>
          </div>
        )}
      </section>

      {advanced && (
        <PresenceSheet
          session={value}
          tracks={phono.tracks.map((t) => ({ id: t.id, title: t.title }))}
        />
      )}
    </div>
  );
}

/**
 * Colonne de droite, collante au scroll — même rôle que `TrackEditAside` sur la
 * page d'édition de titre : un récap de ce qu'on est en train de saisir, ce
 * qu'il manque pour enregistrer, puis les actions. Les coûts et les notes y
 * sont rangés parce qu'ils se remplissent après coup, pas pendant la saisie.
 */
function SessionEditAside({
  session,
  presenceEnabled,
  canSave,
  showMissing,
  onPatch,
  onSave,
  onCancel,
  isEdit,
}: {
  session: StudioSession;
  presenceEnabled: boolean;
  canSave: boolean;
  /** Masqué tant que le formulaire de création est vierge. */
  showMissing: boolean;
  onPatch: (patch: Partial<StudioSession>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const duration = formatDuration(sessionDurationMinutes(session));
  const cost = sessionCost(session);
  const linked = linkedCount(session);
  const performers = session.participants.filter(
    (p) => p.isPerformer !== false
  ).length;

  const missing: string[] = [];
  if (session.title.trim() === "") missing.push("Pas de titre");
  if (!session.date) missing.push("Pas de date");
  if (!session.location.trim()) missing.push("Pas de studio");
  if (session.participants.length === 0) missing.push("Aucun participant");
  if (presenceEnabled && performers === 0)
    missing.push("Aucun artiste-interprète pour la fiche");

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/70">
          Récapitulatif
        </h2>

        <dl className="mt-3 space-y-2 text-xs">
          <Recap
            icon={Clock3}
            label="Créneau"
            value={
              session.date
                ? `${toDisplayDate(session.date)}${
                    session.time ? ` · ${session.time}` : ""
                  }${duration ? ` · ${duration}` : ""}`
                : "Date à définir"
            }
          />
          <Recap
            icon={Users}
            label="Participants"
            value={
              session.participants.length === 0
                ? "Aucun"
                : `${session.participants.length}${
                    presenceEnabled
                      ? ` · ${performers} interprète${performers > 1 ? "s" : ""}`
                      : ""
                  }`
            }
          />
          <Recap
            icon={Disc3}
            label="Catalogue lié"
            value={
              linked === 0 ? "Aucun élément" : `${linked} élément${linked > 1 ? "s" : ""}`
            }
          />
          <Recap
            icon={Euro}
            label="Coût total"
            value={cost > 0 ? `${cost.toLocaleString("fr-FR")} €` : "—"}
            accent={cost > 0}
          />
        </dl>

        {showMissing && missing.length > 0 && (
          <div className="mt-4 border-t border-[rgba(245,245,245,0.08)] pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
              Il manque
            </p>
            <ul className="mt-2 space-y-1.5">
              {missing.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-[#F5F5F5]/70"
                >
                  <span
                    aria-hidden
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "#F59E0B" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="w-full"
          >
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            {isEdit ? "Annuler" : "Retour aux sessions"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/70">
          Coûts
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <Label>Coût du studio</Label>
            <Input
              className="mt-2"
              type="number"
              min="0"
              step="0.01"
              value={session.studioCost ?? 0}
              onChange={(e) => onPatch({ studioCost: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Autres frais</Label>
            <Input
              className="mt-2"
              type="number"
              min="0"
              step="0.01"
              value={session.otherCosts ?? 0}
              onChange={(e) => onPatch({ otherCosts: Number(e.target.value) })}
            />
          </div>
          <p className="text-xs text-[#F5F5F5]/35">
            Ces coûts remontent dans les projets qui partagent un album ou un
            titre avec cette session.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
        <Label>Notes</Label>
        <Textarea
          className="mt-2"
          rows={5}
          value={session.note ?? ""}
          onChange={(e) => onPatch({ note: e.target.value })}
          placeholder="Objectifs, matériel, consignes…"
        />
      </div>
    </aside>
  );
}

function Recap({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="mt-0.5 shrink-0 text-[#F5F5F5]/30" />
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#F5F5F5]/30">
          {label}
        </dt>
        <dd
          className={cn(
            "truncate tabular-nums",
            accent ? "text-[#F0FF00]/80" : "text-[#F5F5F5]/75"
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function PresenceSheet({
  session,
  tracks,
}: {
  session: StudioSession;
  tracks: Array<{ id: string; title: string }>;
}) {
  const trackTitle = (id: string) =>
    tracks.find((t) => t.id === id)?.title ?? id;
  return (
    <article className="hidden bg-white p-10 text-black print:block">
      <header className="border-b-2 border-black pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">
          Fiche de présence — Enregistrement phonographique
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {session.title || "Session studio"}
        </h1>
        <p className="mt-2 text-sm">
          {session.date} · {session.time}
          {session.endTime ? ` – ${session.endTime}` : ""} · {session.location}
        </p>
      </header>
      <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
        <div>
          <p className="font-bold">Producteur phonographique</p>
          <p>{session.producer?.name || session.producer?.legalName || "—"}</p>
          <p>{session.producer?.label}</p>
          <p>{session.producer?.address}</p>
          <p>
            {session.producer?.siret ? `SIRET ${session.producer.siret}` : ""}
          </p>
        </div>
        <div>
          <p className="font-bold">Studio</p>
          <p>{session.location || "—"}</p>
          <p>{session.address}</p>
        </div>
      </div>
      <h2 className="mt-8 border-b border-black pb-2 text-sm font-bold uppercase">
        Artistes-interprètes présents
      </h2>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left">
              Nom / rôle / instrument
            </th>
            <th className="border border-black p-2 text-left">
              Titres interprétés
            </th>
            <th className="border border-black p-2">Horaires</th>
            <th className="border border-black p-2">Signature</th>
          </tr>
        </thead>
        <tbody>
          {session.participants
            .filter((p) => p.isPerformer !== false)
            .map((p) => (
              <tr key={p.id}>
                <td className="border border-black p-2">
                  <strong>{p.name || "—"}</strong>
                  <br />
                  {p.role}
                  {p.instrument ? ` · ${p.instrument}` : ""}
                </td>
                <td className="border border-black p-2">
                  {(p.trackIds ?? session.trackIds ?? [])
                    .map(trackTitle)
                    .join(", ") || "—"}
                </td>
                <td className="border border-black p-2 text-center">
                  {p.arrivalTime || session.time}–
                  {p.departureTime || session.endTime}
                </td>
                <td className="h-16 border border-black p-2" />
              </tr>
            ))}
        </tbody>
      </table>
      <footer className="mt-8 border-t border-black pt-3 text-[10px] text-neutral-600">
        Document préparatoire généré par SIDEKICK. À conserver avec les
        contrats, bulletins et justificatifs de la session.
      </footer>
    </article>
  );
}

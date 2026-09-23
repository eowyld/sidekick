"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { EditionPublisher, Person, PersonRole, SplitEntry, Work } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import { ALL_ROLES, isAuthorRole, isMusicRole, personDisplayName, roleLabel, sumSplits, PERSON_COLORS_HEX } from "../../lib/work-fields";
import { hasExternalPublisher } from "../../lib/sacem-keys";

type Draft = Omit<Work, "id">;

function RoleChips({ value, onToggle, disabled }: { value: PersonRole[]; onToggle: (r: PersonRole) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rôles">
      {ALL_ROLES.map(({ value: role, label }) => (
        <button
          key={role}
          type="button"
          disabled={disabled}
          aria-pressed={value.includes(role)}
          onClick={() => onToggle(role)}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition-colors disabled:cursor-default",
            value.includes(role) ? "bg-[#F0FF00]/15 text-[#F0FF00]" : "bg-[#F5F5F5]/[.07] text-[#F5F5F5]/60 hover:bg-[#F5F5F5]/[.12]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PctInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="w-20">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          aria-label={label}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number.parseFloat(e.target.value) || 0)}
        />
      </div>
      <span className="text-xs text-[#F5F5F5]/50">%</span>
    </div>
  );
}

function CategorySplit({
  title,
  eligible,
  entries,
  onChange,
}: {
  title: string;
  eligible: Person[];
  entries: SplitEntry[];
  onChange: (entries: SplitEntry[]) => void;
}) {
  if (eligible.length === 0) return null;
  const pct = (id: string) => entries.find((e) => e.personId === id)?.pct ?? 0;
  const set = (id: string, value: number) =>
    onChange([...eligible.map((p) => ({ personId: p.id, pct: p.id === id ? value : pct(p.id) }))]);
  const total = sumSplits(eligible.map((p) => ({ personId: p.id, pct: pct(p.id) })));
  const ok = Math.abs(total - 100) < 0.01;
  return (
    <div className="space-y-2 rounded-lg bg-[#F5F5F5]/[.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F5F5F5]/50">{title}</p>
      {eligible.map((p) => (
        <div key={p.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm">{personDisplayName(p)}</span>
          <PctInput value={pct(p.id)} onChange={(v) => set(p.id, v)} label={`Part de ${personDisplayName(p)}`} />
        </div>
      ))}
      <p className={cn("flex items-center gap-1 text-xs", ok ? "text-emerald-400" : "text-rose-300")}>
        {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
        {ok ? "100 %" : `${total} % (${total < 100 ? `il manque ${Math.round((100 - total) * 100) / 100}` : `${Math.round((total - 100) * 100) / 100} de trop`})`}
      </p>
    </div>
  );
}

/** Parts égales qui totalisent exactement 100 : le reste de l'arrondi va au dernier. */
function equalPcts(n: number): number[] {
  if (n === 0) return [];
  const base = Math.floor((100 / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base));
}

const equalSplit = (persons: Person[]): SplitEntry[] => {
  const pcts = equalPcts(persons.length);
  return persons.map((p, i) => ({ personId: p.id, pct: pcts[i] }));
};

/**
 * Ayants droit, éditeurs et parts internes. En lecture seule (`locked`) tant
 * qu'un accord est en cours ou validé : c'est l'accord qui fait foi.
 */
export function RightsEditor({ work, onChange, locked }: { work: Draft; onChange: (fn: (prev: Draft) => Draft) => void; locked: boolean }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [roles, setRoles] = useState<PersonRole[]>(["author", "composer"]);
  const [pubName, setPubName] = useState("");
  const [pubCoad, setPubCoad] = useState("");

  const custom = work.splitsAuthors.some((e) => e.pct > 0) || work.splitsComposers.some((e) => e.pct > 0);
  const withPublisher = hasExternalPublisher(work) || !work.selfPublished;

  const addPerson = () => {
    if (!last.trim() && !pseudo.trim()) return;
    if (roles.length === 0) return;
    const person: Person = { id: crypto.randomUUID(), firstName: first.trim(), name: last.trim(), pseudonym: pseudo.trim(), roles };
    // Ajouter quelqu'un remet les parts à l'équitable : des parts saisies pour
    // trois personnes ne disent rien de la bonne répartition à quatre.
    onChange((prev) => ({ ...prev, persons: [...prev.persons, person], splitsAuthors: [], splitsComposers: [] }));
    setFirst("");
    setLast("");
    setPseudo("");
    setRoles(["author", "composer"]);
  };

  const updatePerson = (id: string, patch: Partial<Person>) =>
    onChange((prev) => ({ ...prev, persons: prev.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const toggleRole = (p: Person, role: PersonRole) => {
    const next = p.roles.includes(role) ? p.roles.filter((r) => r !== role) : [...p.roles, role];
    if (next.length === 0) return;
    onChange((prev) => ({
      ...prev,
      persons: prev.persons.map((x) => (x.id === p.id ? { ...x, roles: next } : x)),
      splitsAuthors: [],
      splitsComposers: [],
    }));
  };

  const removePerson = (id: string) =>
    onChange((prev) => ({ ...prev, persons: prev.persons.filter((p) => p.id !== id), splitsAuthors: [], splitsComposers: [] }));

  const addPublisher = () => {
    if (!pubName.trim()) return;
    const pub: EditionPublisher = { id: crypto.randomUUID(), name: pubName.trim(), coad: pubCoad.trim(), pct: 0 };
    onChange((prev) => ({ ...prev, selfPublished: false, externalPublishers: [...prev.externalPublishers, pub] }));
    setPubName("");
    setPubCoad("");
  };

  const setCustom = (on: boolean) =>
    onChange((prev) =>
      on
        ? {
            ...prev,
            splitsAuthors: equalSplit(prev.persons.filter(isAuthorRole)),
            splitsComposers: equalSplit(prev.persons.filter(isMusicRole)),
            externalPublishers: prev.externalPublishers.map((p, i, all) => ({ ...p, pct: equalPcts(all.length)[i] })),
          }
        : { ...prev, splitsAuthors: [], splitsComposers: [], externalPublishers: prev.externalPublishers.map((p) => ({ ...p, pct: 0 })) },
    );

  if (locked) {
    return (
      <div className="space-y-2">
        {work.persons.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[#F5F5F5]/[.03] px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ background: PERSON_COLORS_HEX[i % PERSON_COLORS_HEX.length] }} />
            <span className="font-medium">{personDisplayName(p)}</span>
            <span className="text-xs text-[#F5F5F5]/50">{p.roles.map(roleLabel).join(", ")}</span>
          </div>
        ))}
        {hasExternalPublisher(work) &&
          work.externalPublishers.map((pub) => (
            <div key={pub.id} className="flex items-center gap-3 rounded-lg bg-[#F5F5F5]/[.03] px-3 py-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#eab308]" />
              <span className="font-medium">{pub.name}</span>
              <span className="text-xs text-[#F5F5F5]/50">Éditeur{pub.coad ? ` · ${pub.coad}` : ""}</span>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {work.persons.length > 0 && (
        <div className="space-y-2">
          {work.persons.map((p, i) => (
            <div key={p.id} className="space-y-3 rounded-lg border border-[#F5F5F5]/[.08] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PERSON_COLORS_HEX[i % PERSON_COLORS_HEX.length] }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{personDisplayName(p)}</span>
                <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${personDisplayName(p)}`} onClick={() => removePerson(p.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input aria-label="Prénom" placeholder="Prénom" value={p.firstName} onChange={(e) => updatePerson(p.id, { firstName: e.target.value })} />
                <Input aria-label="Nom" placeholder="Nom (état civil)" value={p.name} onChange={(e) => updatePerson(p.id, { name: e.target.value })} />
                <Input aria-label="Pseudonyme" placeholder="Pseudonyme" value={p.pseudonym} onChange={(e) => updatePerson(p.id, { pseudonym: e.target.value })} />
              </div>
              <RoleChips value={p.roles} onToggle={(r) => toggleRole(p, r)} />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed border-[#F5F5F5]/15 p-3">
        <p className="text-xs font-medium text-[#F5F5F5]/70">{work.persons.length === 0 ? "Ajouter un ayant droit" : "Ajouter un co-auteur"}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input aria-label="Prénom du co-auteur" placeholder="Prénom" value={first} onChange={(e) => setFirst(e.target.value)} />
          <Input aria-label="Nom du co-auteur" placeholder="Nom (état civil)" value={last} onChange={(e) => setLast(e.target.value)} />
          <Input
            aria-label="Pseudonyme du co-auteur"
            placeholder="Pseudonyme"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPerson())}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RoleChips value={roles} onToggle={(r) => setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))} />
          <Button type="button" size="sm" variant="secondary" onClick={addPerson} disabled={(!last.trim() && !pseudo.trim()) || roles.length === 0}>
            <Plus size={14} className="mr-1.5" />
            Ajouter
          </Button>
        </div>
        <p className="text-[11px] text-[#F5F5F5]/40">
          {EDITION_AGREEMENTS_OPEN
            ? "Le nom civil de chacun sera demandé dans l’accord : ton co-auteur pourra le compléter lui-même."
            : "Renseigne le nom civil de chacun : c’est sous ce nom que l’œuvre se déclare à la SACEM."}
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            checked={withPublisher}
            onCheckedChange={(v) => onChange((prev) => ({ ...prev, selfPublished: v !== true, externalPublishers: v === true ? prev.externalPublishers : [] }))}
          />
          Un éditeur est présent sur cette œuvre
        </label>
        {withPublisher && (
          <div className="space-y-2 pl-7">
            {work.externalPublishers.map((pub) => {
              const patch = (v: Partial<EditionPublisher>) =>
                onChange((prev) => ({ ...prev, externalPublishers: prev.externalPublishers.map((x) => (x.id === pub.id ? { ...x, ...v } : x)) }));
              return (
                <div key={pub.id} className="space-y-3 rounded-lg border border-[#eab308]/30 bg-[#eab308]/[.04] p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#eab308]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{pub.name || "Éditeur sans nom"}</span>
                    <span className="rounded-full bg-[#eab308]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#eab308]">Éditeur</span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${pub.name}`} onClick={() => onChange((prev) => ({ ...prev, externalPublishers: prev.externalPublishers.filter((x) => x.id !== pub.id) }))}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Input aria-label="Nom de l'éditeur" value={pub.name} onChange={(e) => patch({ name: e.target.value })} />
                    </div>
                    <div className="w-36 shrink-0">
                      <Input aria-label="Code COAD" placeholder="COAD" value={pub.coad} onChange={(e) => patch({ coad: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="space-y-3 rounded-lg border border-dashed border-[#F5F5F5]/15 p-3">
              <p className="text-xs font-medium text-[#F5F5F5]/70">{work.externalPublishers.length === 0 ? "Ajouter un éditeur" : "Ajouter un autre éditeur"}</p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Input aria-label="Nouvel éditeur" placeholder="Nom de la société d’édition" value={pubName} onChange={(e) => setPubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPublisher())} />
                </div>
                <div className="w-36 shrink-0">
                  <Input aria-label="Code COAD du nouvel éditeur" placeholder="COAD" value={pubCoad} onChange={(e) => setPubCoad(e.target.value)} />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addPublisher} disabled={!pubName.trim()}>
                  <Plus size={14} className="mr-1.5" />
                  Ajouter
                </Button>
              </div>
              {work.externalPublishers.length === 0 && (
                <p className="text-[11px] text-[#F5F5F5]/40">L’éditeur n’est pris en compte dans la répartition qu’une fois ajouté.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {work.persons.length >= 2 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-xs text-[#F5F5F5]/65">Parts entre co-auteurs</Label>
            <div className="flex rounded-lg border border-[#F5F5F5]/10 p-0.5">
              {[
                { on: false, label: "À parts égales" },
                { on: true, label: "Personnalisées" },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  aria-pressed={custom === m.on}
                  onClick={() => custom !== m.on && setCustom(m.on)}
                  className={cn("rounded-md px-3 py-1 text-xs", custom === m.on ? "bg-[#F5F5F5]/[.12] text-[#F5F5F5]" : "text-[#F5F5F5]/50 hover:text-[#F5F5F5]")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {custom && (
            <div className="grid gap-3 md:grid-cols-2">
              <CategorySplit title="Auteurs & adaptateurs" eligible={work.persons.filter(isAuthorRole)} entries={work.splitsAuthors} onChange={(splitsAuthors) => onChange((prev) => ({ ...prev, splitsAuthors }))} />
              <CategorySplit title="Compositeurs & arrangeurs" eligible={work.persons.filter(isMusicRole)} entries={work.splitsComposers} onChange={(splitsComposers) => onChange((prev) => ({ ...prev, splitsComposers }))} />
              {hasExternalPublisher(work) && work.externalPublishers.length > 1 && (
                <CategorySplit
                  title="Éditeurs"
                  eligible={work.externalPublishers.map((p) => ({ id: p.id, firstName: "", name: p.name, pseudonym: "", roles: [] }))}
                  entries={work.externalPublishers.map((p) => ({ personId: p.id, pct: p.pct }))}
                  onChange={(entries) => onChange((prev) => ({ ...prev, externalPublishers: prev.externalPublishers.map((p) => ({ ...p, pct: entries.find((e) => e.personId === p.id)?.pct ?? 0 })) }))}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

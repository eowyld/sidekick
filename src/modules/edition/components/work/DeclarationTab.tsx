"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardCopy, FileText, Landmark, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Work } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import { Panel, TextField } from "@/modules/live/components/shared/LiveUI";
import type { Agreement } from "../../lib/agreement-types";
import { summarize } from "../../lib/agreement-types";
import { declarationRecap } from "../../lib/declaration";
import { declaredWithoutAgreement } from "../../lib/work-lifecycle";
import { EXPLOITATION_TYPES } from "../../lib/work-fields";

type Draft = Omit<Work, "id">;

export function DeclarationTab({ work, onChange, agreement }: { work: Draft; onChange: (fn: (prev: Draft) => Draft) => void; agreement: Agreement | null }) {
  const [territory, setTerritory] = useState("");
  const summary = agreement ? summarize(agreement) : null;
  const set = (patch: Partial<Draft>) => onChange((prev) => ({ ...prev, ...patch }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(declarationRecap(work, agreement));
      toast.success("Récapitulatif copié.");
    } catch {
      toast.error("Impossible de copier : ton navigateur a refusé l’accès au presse-papiers.");
    }
  };

  return (
    <div className="space-y-5">
      <Panel title="Déclaration SACEM" icon={Landmark} color="#A78BFA" description="SIDEKICK ne déclare pas à ta place : il te prépare ce que le formulaire demande. Le statut se change en haut de la fiche.">
        {EDITION_AGREEMENTS_OPEN && declaredWithoutAgreement(work, summary) && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[.07] px-3 py-2 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Déclarée sans accord validé par tous les co-auteurs. Normal pour une œuvre ancienne ; pour une nouvelle, c’est la situation où naissent les litiges de parts.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-4">
          <TextField label="ISWC" value={work.iswc} onChange={(iswc) => set({ iswc })} placeholder="T-123.456.789-0" />
          <div className="space-y-2">
            <Label className="text-xs text-[#F5F5F5]/65">Première exploitation</Label>
            <DatePicker value={work.firstExploitationDate} onChange={(firstExploitationDate) => set({ firstExploitationDate })} />
          </div>
          <TextField label="Genre" value={work.genre} onChange={(genre) => set({ genre })} placeholder="Pop, rap, électro…" />
          <TextField label="Durée" value={work.duration} onChange={(duration) => set({ duration })} placeholder="3:42" />
        </div>
      </Panel>

      <Panel
        title="À recopier dans l’espace membre"
        icon={FileText}
        description={EDITION_AGREEMENTS_OPEN ? "Titre, durée, ayants droit avec leurs parts, et le nom civil et l’IPI que tes co-auteurs ont complétés dans l’accord." : "Titre, durée, genre et ayants droit avec leurs parts DEP et DRM, dans l’ordre où le formulaire les demande."}
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
            <ClipboardCopy size={13} className="mr-1.5" />
            Copier
          </Button>
        }
      >
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 font-mono text-xs leading-relaxed text-[#F5F5F5]/80">{declarationRecap(work, agreement)}</pre>
      </Panel>

      <Panel title="Exploitation" icon={Landmark} color="#38BDF8">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-[#F5F5F5]/65">Types d’exploitation</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXPLOITATION_TYPES.map(({ value, label }) => {
                const on = work.exploitationTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ exploitationTypes: on ? work.exploitationTypes.filter((t) => t !== value) : [...work.exploitationTypes, value] })}
                    className={cn("rounded-full px-3 py-1 text-xs", on ? "bg-[#38BDF8]/15 text-[#38BDF8]" : "bg-[#F5F5F5]/[.07] text-[#F5F5F5]/60 hover:bg-[#F5F5F5]/[.12]")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <TextField label="Premier diffuseur ou exploitant" value={work.firstBroadcaster} onChange={(firstBroadcaster) => set({ firstBroadcaster })} placeholder="Spotify, une radio, une salle…" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-[#F5F5F5]/65">Territoires</Label>
              <button
                type="button"
                aria-pressed={work.worldwideRights}
                onClick={() => set({ worldwideRights: !work.worldwideRights, territories: [] })}
                className={cn("rounded-full px-3 py-1 text-xs", work.worldwideRights ? "bg-[#F0FF00]/15 text-[#F0FF00]" : "bg-[#F5F5F5]/[.07] text-[#F5F5F5]/60")}
              >
                Monde entier
              </button>
            </div>
            {!work.worldwideRights && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label="Ajouter un territoire"
                      placeholder="France, Belgique…"
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && territory.trim()) {
                          e.preventDefault();
                          set({ territories: [...work.territories, territory.trim()] });
                          setTerritory("");
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Ajouter le territoire"
                    disabled={!territory.trim()}
                    onClick={() => {
                      set({ territories: [...work.territories, territory.trim()] });
                      setTerritory("");
                    }}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {work.territories.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-[#F5F5F5]/[.07] px-3 py-1 text-xs">
                      {t}
                      <button type="button" aria-label={`Retirer ${t}`} onClick={() => set({ territories: work.territories.filter((x) => x !== t) })}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <TextField label="Notes" area value={work.notes} onChange={(notes) => set({ notes })} placeholder="Contexte, historique de l’œuvre…" />
        </div>
      </Panel>
    </div>
  );
}

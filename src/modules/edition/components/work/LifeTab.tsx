"use client";

import { useState } from "react";
import Link from "next/link";
import { Disc3, Link2Off, Mic2, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Work } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { Choice, Panel } from "@/modules/live/components/shared/LiveUI";
import { dateFR } from "@/modules/live/lib/live-model";
import { releaseStatusLabel } from "@/modules/phono/lib/release-status";
import { isProgramDeclared, isReleased, workLife } from "../../lib/work-life";
import { manualStatus } from "../../lib/work-lifecycle";

/**
 * Vie de l'œuvre hors d'Édition. Les actions s'enregistrent tout de suite, sans
 * passer par le bouton « Enregistrer » de la fiche : elles écrivent dans Phono
 * et dans Live, pas dans le brouillon de l'œuvre.
 */
export function LifeTab({ work, artistName, today }: { work: Work; artistName: string; today: string }) {
  const { setWorks } = useEditionData();
  const { tracks, setTracks } = usePhonoData();
  const live = useLiveData();
  const [pick, setPick] = useState("");
  const life = workLife(work, tracks, live.tourDates, artistName, today);
  const linkedIds = new Set(life.tracks.map((t) => t.id));
  const candidates = tracks.filter((t) => !linkedIds.has(t.id) && (!t.linkedWorkId || t.linkedWorkId === work.id));

  // Le lien vit des deux côtés : Projets lit `track.linkedWorkId`, Édition
  // historiquement `work.linkedTrackIds`. On écrit les deux.
  const link = (trackId: string) => {
    if (!trackId) return;
    setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, linkedTrackIds: [...new Set([...(w.linkedTrackIds ?? []), trackId])] } : w)));
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, linkedWorkId: work.id } : t)));
    setPick("");
  };
  const unlink = (trackId: string) => {
    setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, linkedTrackIds: (w.linkedTrackIds ?? []).filter((id) => id !== trackId) } : w)));
    setTracks((prev) => prev.map((t) => (t.id === trackId && t.linkedWorkId === work.id ? { ...t, linkedWorkId: undefined } : t)));
  };
  const toggleProgram = async (id: number, declared: boolean) => {
    const ok = await live.setTourDates((prev) => prev.map((d) => (d.id === id ? { ...d, details: { ...d.details, sacemProgramDeclared: declared } } : d)));
    if (!ok) toast.error("Impossible d’enregistrer : réessaie dans un instant.");
  };

  return (
    <div className="space-y-5">
      <Panel title="Enregistrements" icon={Disc3} color="#F59E0B" description="Les titres Phono qui enregistrent cette œuvre.">
        {life.releasedUndeclared && (
          <p className="mb-4 rounded-lg border border-amber-400/25 bg-amber-400/[.07] px-3 py-2 text-sm text-amber-200">
            Un enregistrement est sorti et l’œuvre n’est pas déclarée : ses droits d’auteur ne te sont pas reversés tant qu’elle ne l’est pas.
          </p>
        )}
        {life.tracks.length === 0 ? (
          <p className="text-sm text-[#F5F5F5]/50">Aucun titre relié pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-[#F5F5F5]/[.06]">
            {life.tracks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/phono/catalogue/titre/${t.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-[#F0FF00]">
                  {t.title}
                  {t.mainArtist && <span className="text-[#F5F5F5]/45"> · {t.mainArtist}</span>}
                </Link>
                <span className={isReleased(t, today) ? "text-xs text-emerald-400" : "text-xs text-[#F5F5F5]/50"}>
                  {isReleased(t, today) ? "Sorti" : t.status ? releaseStatusLabel(t.status) : "En production"}
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label={`Délier ${t.title}`} onClick={() => unlink(t.id)}>
                  <Link2Off size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {candidates.length > 0 && (
          <div className="mt-4 max-w-sm">
            <Choice label="Relier un titre Phono" value={pick} onChange={link} options={candidates.map((t) => ({ value: t.id, label: t.title }))} placeholder="Choisir un titre" />
          </div>
        )}
      </Panel>

      <Panel
        title="Concerts"
        icon={Mic2}
        color="#F0FF00"
        description="Les dates passées dont la setlist contient cette œuvre. Déclarer le programme d’un concert à la SACEM, c’est toucher les droits de ce qu’on y a joué."
      >
        {life.performances.length === 0 ? (
          <p className="text-sm text-[#F5F5F5]/50">
            Jouée nulle part pour l’instant. Une date compte dès que sa setlist contient un titre relié à cette œuvre, ou son titre exact.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-[#F5F5F5]/55">
              Jouée {life.performances.length} fois
              {life.undeclaredPrograms.length > 0 && <span className="text-amber-300"> · {life.undeclaredPrograms.length} programme{life.undeclaredPrograms.length > 1 ? "s" : ""} non déclaré{life.undeclaredPrograms.length > 1 ? "s" : ""}</span>}
            </p>
            <ul className="divide-y divide-[#F5F5F5]/[.06]">
              {life.performances.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Link href={`/live/representations/${d.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-[#F0FF00]">
                    <span className="tabular-nums text-[#F5F5F5]/55">{dateFR(d.date)}</span> · {d.venue || "Lieu non précisé"}
                    {d.city && <span className="text-[#F5F5F5]/45"> · {d.city}</span>}
                  </Link>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F5F5F5]/70">
                    <Checkbox checked={isProgramDeclared(d)} onCheckedChange={(v) => void toggleProgram(d.id, v === true)} />
                    Programme déclaré
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel title="Revenus" icon={Wallet} color="#34D399" description="Ce que l’œuvre rapporte en droits d’auteur.">
        <p className="text-sm text-[#F5F5F5]/50">
          Les droits d’auteur importés dans Revenus apparaîtront ici, œuvre par œuvre.
          {manualStatus(work.status) === "draft" && " Une œuvre non déclarée ne génère aucun droit."}
        </p>
      </Panel>
    </div>
  );
}

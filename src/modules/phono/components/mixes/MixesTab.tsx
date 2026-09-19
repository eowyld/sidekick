"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import type { Mix } from "@/lib/sidekick-store";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { formatTracklistForCopy, normalizeMix } from "@/modules/phono/lib/mix";
import { sortCatalog } from "@/modules/phono/lib/catalog-sort";
import { CatalogSortMenu } from "../CatalogSortMenu";
import { usePhonoSort } from "../PhonoSortProvider";
import { MixAudioDialog } from "./MixAudioDialog";
import { MixRow } from "./MixRow";

interface MixesTabProps {
  mixes: Mix[];
  setMixes: (fn: (prev: Mix[]) => Mix[]) => void;
}

const strip = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function MixesTab({ mixes, setMixes }: MixesTabProps) {
  const router = useRouter();
  const { sorts } = usePhonoSort();
  const [search, setSearch] = useState("");
  /** Mix dont la tracklist est dépliée. Un seul à la fois, volontairement. */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /**
   * Mix dont on change le fichier audio. Gardé par id et non par objet : le
   * dialogue doit montrer l'état courant du mix après chaque écriture, pas
   * l'instantané qui était là à l'ouverture.
   */
  const [audioMixId, setAudioMixId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mix | null>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  const normalized = useMemo(() => mixes.map(normalizeMix), [mixes]);

  const visible = useMemo(() => {
    const q = strip(search.trim());
    const rows = q
      ? normalized.filter((m) =>
          strip([m.title, m.artists].join(" ")).includes(q)
        )
      : normalized;
    // Même fonction de tri que la file du lecteur : « suivant » enchaîne les
    // mixes dans l'ordre affiché ici.
    return sortCatalog(rows, sorts.mixes);
  }, [normalized, search, sorts.mixes]);

  const patchMix = (id: string, patch: Partial<Mix>) =>
    setMixes((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const openCreate = () => router.push("/phono/catalogue/mix/nouveau");
  const openEdit = (mix: Mix) => router.push(`/phono/catalogue/mix/${mix.id}`);

  const confirmDelete = (mix: Mix) => {
    setMixes((prev) => prev.filter((m) => m.id !== mix.id));
    if (expandedId === mix.id) setExpandedId(null);
    setPendingDelete(null);
    if (mix.audioPath && mix.audioSource === "upload") {
      void handleDetachedAudio([mix.audioPath], deleteFromDrive);
    }
    setDeleteFromDrive(false);
  };

  const copyTracklist = (mix: Mix) => {
    void navigator.clipboard.writeText(formatTracklistForCopy(mix.tracklist ?? []));
    toast.success("Tracklist copiée");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5F5]/30"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un mix…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <CatalogSortMenu scope="mixes" />
          <Button type="button" onClick={openCreate} className="btn-glow">
            <Plus className="mr-2 h-4 w-4" />
            Mix
          </Button>
        </div>
      </div>

      {mixes.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="Aucun mix"
          description="DJ sets, live sets, mixes, émissions : référence ici tes longs formats. Leur tracklist alimente les déclarations de droits."
          action={{ label: "Ajouter un mix", onClick: openCreate }}
        />
      ) : visible.length === 0 ? (
        <NoResult
          query={search.trim() || undefined}
          hasFilters={search.trim() !== ""}
          onReset={() => setSearch("")}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((mix) => (
            <MixRow
              key={mix.id}
              mix={mix}
              expanded={expandedId === mix.id}
              onToggleExpand={() =>
                setExpandedId((id) => (id === mix.id ? null : mix.id))
              }
              onEdit={() => openEdit(mix)}
              onDelete={() => setPendingDelete(mix)}
              onCopyTracklist={() => copyTracklist(mix)}
              onAttachAudio={() => setAudioMixId(mix.id)}
            />
          ))}
        </div>
      )}

      <MixAudioDialog
        mix={normalized.find((m) => m.id === audioMixId) ?? null}
        onOpenChange={(open) => {
          if (!open) setAudioMixId(null);
        }}
        onPatch={(patch) => {
          if (audioMixId) patchMix(audioMixId, patch);
        }}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteFromDrive(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer « {pendingDelete?.title || "Sans titre"} » ?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le mix et sa tracklist sont retirés du catalogue. Cette action est
              définitive.
            </DialogDescription>
          </DialogHeader>
          {pendingDelete?.audioPath && pendingDelete.audioSource === "upload" ? (
            <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
              <Checkbox
                id="delete-mix-from-drive"
                checked={deleteFromDrive}
                onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
              />
              <Label
                htmlFor="delete-mix-from-drive"
                className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
              >
                Supprimer aussi le fichier du Drive. Sans cette case, il reste
                dans Drive → Phono → Catalogue.
              </Label>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                setDeleteFromDrive(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDelete && confirmDelete(pendingDelete)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Mic, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import type { Mix } from "@/lib/sidekick-store";
import { formatTracklistForCopy, normalizeMix } from "@/modules/phono/lib/mix";
import { MixDialog } from "./MixDialog";
import { MixRow } from "./MixRow";

interface MixesTabProps {
  mixes: Mix[];
  setMixes: (fn: (prev: Mix[]) => Mix[]) => void;
}

const strip = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function MixesTab({ mixes, setMixes }: MixesTabProps) {
  const posthog = usePostHog();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMix, setEditingMix] = useState<Mix | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mix | null>(null);

  const normalized = useMemo(() => mixes.map(normalizeMix), [mixes]);

  const visible = useMemo(() => {
    const q = strip(search.trim());
    if (!q) return normalized;
    return normalized.filter((m) =>
      strip([m.title, m.artists].join(" ")).includes(q)
    );
  }, [normalized, search]);

  const openCreate = () => {
    setEditingMix(null);
    setDialogOpen(true);
  };

  const submitMix = (mix: Mix) => {
    setMixes((prev) => {
      const exists = prev.some((m) => m.id === mix.id);
      if (exists) return prev.map((m) => (m.id === mix.id ? mix : m));
      posthog?.capture("item_created", { module: "phono" });
      return [mix, ...prev];
    });
  };

  const confirmDelete = (mix: Mix) => {
    setMixes((prev) => prev.filter((m) => m.id !== mix.id));
    if (editingMix?.id === mix.id) {
      setEditingMix(null);
      setDialogOpen(false);
    }
    setPendingDelete(null);
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
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Mix
        </Button>
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
              onEdit={() => {
                setEditingMix(mix);
                setDialogOpen(true);
              }}
              onDelete={() => setPendingDelete(mix)}
              onCopyTracklist={() => copyTracklist(mix)}
            />
          ))}
        </div>
      )}

      <MixDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMix(null);
        }}
        mix={editingMix}
        onSubmit={submitMix}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
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

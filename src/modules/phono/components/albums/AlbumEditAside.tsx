"use client";

import { Button } from "@/components/ui/button";
import { TrackCoverField } from "../tracks/TrackCoverField";
import type { AlbumFormState } from "./AlbumEditPage";

interface AlbumEditAsideProps {
  form: AlbumFormState;
  patch: (values: Partial<AlbumFormState>) => void;
  canSubmit: boolean;
  saving: boolean;
  dirty: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Un manque = une chose que l'artiste devra faire, formulée comme telle. */
function missingItems(form: AlbumFormState): string[] {
  const missing: string[] = [];
  if (form.trackIds.length === 0) missing.push("Aucun titre dans la tracklist");
  if (!form.cover) missing.push("Pas de pochette");
  if (form.upcEan.trim() === "") missing.push("Pas d'UPC / EAN");
  if (form.releaseDate.trim() === "") missing.push("Pas de date de sortie");
  return missing;
}

export function AlbumEditAside({
  form,
  patch,
  canSubmit,
  saving,
  dirty,
  onSubmit,
  onCancel,
}: AlbumEditAsideProps) {
  const missing = missingItems(form);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <TrackCoverField value={form.cover} onChange={(cover) => patch({ cover })} />

      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/70">
          {missing.length > 0 ? "Il manque" : "Rien ne manque"}
        </h2>

        {missing.length > 0 ? (
          <ul className="mt-3 space-y-2">
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
        ) : (
          <p className="mt-3 text-xs text-[#F5F5F5]/55">
            Tracklist, pochette, UPC et date de sortie sont renseignés.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || saving}
            className="w-full"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            {dirty ? "Annuler les modifications" : "Retour au catalogue"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

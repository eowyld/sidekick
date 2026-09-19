"use client";

import { Button } from "@/components/ui/button";
import { TrackCoverField } from "../tracks/TrackCoverField";
import type { MixFormState } from "./MixEditPage";

interface MixEditAsideProps {
  form: MixFormState;
  patch: (values: Partial<MixFormState>) => void;
  canSubmit: boolean;
  /**
   * Ce qui empêche d'enregistrer, s'il y a lieu. Un bouton grisé sans raison
   * laisse l'artiste cliquer dans le vide sans comprendre.
   */
  blocking: string | null;
  saving: boolean;
  dirty: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Un manque = une chose que l'artiste devra faire, formulée comme telle. */
function missingItems(form: MixFormState): string[] {
  const missing: string[] = [];
  if (!form.audio.audioPath) missing.push("Aucun fichier audio");
  if (!form.cover) missing.push("Pas de pochette");
  if (form.tracklist.length === 0) missing.push("Tracklist vide");
  if (form.releaseDate.trim() === "") missing.push("Pas de date de publication");
  return missing;
}

export function MixEditAside({
  form,
  patch,
  canSubmit,
  blocking,
  saving,
  dirty,
  onSubmit,
  onCancel,
}: MixEditAsideProps) {
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
            Fichier, pochette, tracklist et date de publication sont renseignés.
          </p>
        )}

        {blocking ? (
          <p className="mt-4 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-2 text-xs text-[#F59E0B]">
            {blocking}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || saving}
            className="w-full"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
            {dirty ? "Annuler les modifications" : "Retour au catalogue"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

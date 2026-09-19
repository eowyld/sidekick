"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TrackCoverFieldProps {
  value?: string;
  onChange: (cover: string | undefined) => void;
}

/**
 * Champ « Cover » : sélection d'une image locale, lue en data URL.
 *
 * Autonome et sans dépendance au formulaire parent, pour être réutilisé tel
 * quel par `AlbumEditAside` — un album porte la même notion de cover.
 */
export function TrackCoverField({ value, onChange }: TrackCoverFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <Label className="block">Cover</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {value ? (
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover du titre"
            className="h-24 w-24 shrink-0 rounded-lg border border-[rgba(245,245,245,0.12)] object-cover"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="mr-1 h-3.5 w-3.5" />
              Changer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
              className="text-muted-foreground hover:text-destructive"
              title="Retirer la cover"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Ajouter une image
        </Button>
      )}
    </div>
  );
}

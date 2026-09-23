"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileToLogoDataUrl, type ArtistLogo, type LogoVariant } from "@/lib/artist-logo";

const SLOTS: { variant: LogoVariant; label: string; hint: string; background: string }[] = [
  { variant: "light", label: "Fond clair", hint: "Factures et fiches techniques", background: "#ffffff" },
  { variant: "dark", label: "Fond sombre", hint: "Liens d’écoute et mails d’invitation", background: "#101010" },
];

/**
 * Les deux versions du logo, côte à côte, chacune sur le fond où elle servira.
 * Un emplacement vide montre en grisé la version qui le remplacera : un logo
 * noir qui disparaît sur le fond sombre se voit tout de suite.
 */
export function ArtistLogoField({
  logo,
  onChange,
}: {
  logo: ArtistLogo;
  onChange: (variant: LogoVariant, value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <LogoSlot
            key={slot.variant}
            {...slot}
            value={logo[slot.variant]}
            fallback={logo[slot.variant === "light" ? "dark" : "light"]}
            onChange={(value) => onChange(slot.variant, value)}
          />
        ))}
      </div>
      <p className="text-xs text-[#F5F5F5]/40">
        De préférence un PNG à fond transparent, au moins 320 × 320 px, pour un rendu net sur tous les documents.
      </p>
    </div>
  );
}

function LogoSlot({
  label,
  hint,
  background,
  value,
  fallback,
  onChange,
}: {
  label: string;
  hint: string;
  background: string;
  value: string | null;
  fallback: string | null;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const shown = value ?? fallback;

  const handleFile = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisis un fichier image (PNG, JPG, SVG…).");
      return;
    }
    try {
      onChange(await fileToLogoDataUrl(file));
    } catch {
      setError("Impossible de traiter cette image.");
    }
  };

  return (
    <div className="min-w-0 space-y-2">
      <div>
        <p className="text-sm font-medium text-[#F5F5F5]">{label}</p>
        <p className="text-xs text-[#F5F5F5]/50">{hint}</p>
      </div>
      {/* Fond en style direct : globals.css force `bg-white` en sombre. */}
      <div
        className="flex h-24 items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] p-3"
        style={{ backgroundColor: background }}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt={value ? `Logo, ${label.toLowerCase()}` : ""}
            className="max-h-full max-w-full object-contain"
            style={value ? undefined : { opacity: 0.35 }}
          />
        ) : (
          <span className="text-xs" style={{ color: background === "#ffffff" ? "#6b7280" : "#8f8f8f" }}>
            Aucun logo
          </span>
        )}
      </div>
      {!value && fallback && (
        <p className="text-xs text-[#F5F5F5]/45">L’autre version sera utilisée ici.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1.5 h-4 w-4" />
          {value ? "Remplacer" : "Importer"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-red-950/40"
            onClick={() => onChange(null)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Retirer
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

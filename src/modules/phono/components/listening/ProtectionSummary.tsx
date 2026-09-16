"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

interface ProtectionSummaryProps {
  hasPassword: boolean;
  expiresAt: string | null;
  allowDownload: boolean;
}

/**
 * Résume les protections actives du lien en cours de composition, et énonce
 * honnêtement leur limite : promettre une étanchéité totale à un artiste qui
 * envoie un album non sorti serait le pire service à lui rendre.
 */
export function ProtectionSummary({
  hasPassword,
  expiresAt,
  allowDownload,
}: ProtectionSummaryProps) {
  const [open, setOpen] = useState(false);

  const badges = [
    "Lien non devinable",
    hasPassword ? "Protégé par mot de passe" : null,
    expiresAt
      ? `Expire le ${new Date(expiresAt).toLocaleDateString("fr-FR")}`
      : null,
    allowDownload ? "Téléchargement autorisé" : "Téléchargement désactivé",
  ].filter(Boolean) as string[];

  return (
    <div
      className="rounded-lg p-3"
      style={{
        border: "1px solid rgba(245,245,245,0.12)",
        background: "rgba(44,44,46,0.72)",
      }}
    >
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#F0FF00" }} />
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          {badges.join(" · ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 flex items-center gap-1 text-xs"
        style={{ color: "rgba(245,245,245,0.7)" }}
      >
        <ChevronDown className="h-3.5 w-3.5" />
        Comment ce lien est protégé
      </button>

      {open && (
        <div
          className="mt-2 space-y-2 text-xs leading-relaxed"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          <p>
            L&apos;adresse du lien est impossible à deviner et la page n&apos;est
            pas indexée par les moteurs de recherche. Les fichiers audio sont
            servis par des adresses temporaires qui expirent au bout de quelques
            minutes : une URL copiée puis repartagée ne fonctionne plus. Vous
            pouvez désactiver le lien à tout moment.
          </p>
          <p>
            Ces protections réduisent fortement le risque de rediffusion
            accidentelle — un lien transféré, une adresse copiée. Elles ne
            remplacent pas la confiance accordée au destinataire : aucun système
            ne peut empêcher quelqu&apos;un d&apos;enregistrer un son qu&apos;il
            est autorisé à écouter.
          </p>
        </div>
      )}
    </div>
  );
}

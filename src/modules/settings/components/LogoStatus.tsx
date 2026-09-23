"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { logoFor, type LogoTarget } from "@/lib/artist-logo";

/**
 * Interrupteur du logo sur ce document précis. Le logo lui-même (les deux
 * versions claire/sombre) se gère dans Réglages > Compte ; ce switch ne
 * touche que `artist_logo_exports[target]`, activé par défaut.
 */
export function LogoStatus({ target }: { target: LogoTarget }) {
  const { logo, logoExports, setLogoExports } = useArtistIdentity();
  const shown = logoFor(logo, logoExports, target);
  const hasLogo = Boolean(logo.light || logo.dark);

  return (
    <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.12)] px-4 py-3">
      {shown && (
        // Fond en style direct : globals.css force `bg-white` en sombre ; le document est blanc.
        <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded-sm p-1" style={{ backgroundColor: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="max-h-full max-w-full object-contain" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <label htmlFor={`logo-status-${target}`} className="block text-sm font-medium text-[#F5F5F5]">
          Logo sur ce document
        </label>
        {!hasLogo && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Aucun logo importé.{" "}
            <Link href="/settings" className="underline-offset-2 hover:text-[#F5F5F5] hover:underline">
              En ajouter un dans Compte
            </Link>
          </p>
        )}
      </div>
      <Switch
        id={`logo-status-${target}`}
        checked={logoExports[target]}
        onCheckedChange={(checked) => setLogoExports({ [target]: checked })}
      />
    </div>
  );
}

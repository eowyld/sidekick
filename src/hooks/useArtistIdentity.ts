"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { defaultArtist, legalNameParts } from "@/lib/artist-identity";

/** Clé SWR des métadonnées de compte. Réglages la revalide après un changement de nom. */
export const AUTH_META_KEY = "auth_user_metadata";

async function fetchMeta(): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await getSessionUser(createClient());
  return (user?.user_metadata ?? {}) as Record<string, unknown>;
}

/**
 * Point d'entrée unique des écrans qui ont besoin du nom de l'utilisateur.
 * Voir CLAUDE.md, section « Identité de l'artiste ».
 */
export function useArtistIdentity() {
  const {
    artistName,
    identityMode,
    setArtistIdentity,
    artistLogo,
    artistLogoExports,
    setArtistLogo,
    setArtistLogoExports,
    preferencesReady,
  } = usePreferencesData();
  const { data: meta, isLoading } = useSWR(AUTH_META_KEY, fetchMeta);

  const legal = useMemo(() => legalNameParts(meta ?? {}), [meta]);

  return {
    /** Nom affiché (artiste ou « Prénom Nom »), chaîne vide si non renseigné. */
    artistName,
    identityMode,
    setArtistIdentity,
    /** Nom civil, pour les œuvres et le choix « nom propre ». */
    legal,
    /** Valeur initiale d'un champ artiste de sortie. */
    releaseArtist: defaultArtist(artistName),
    /** Logo en deux versions (fonds clairs / sombres), chacune facultative. Passer par `logoFor()`. */
    logo: artistLogo,
    /** Interrupteurs par export, normalisés (clé absente = affiché). */
    logoExports: artistLogoExports,
    setLogo: setArtistLogo,
    setLogoExports: setArtistLogoExports,
    /** Préférences et métadonnées chargées : on peut pré-remplir. */
    ready: preferencesReady && !isLoading,
  };
}

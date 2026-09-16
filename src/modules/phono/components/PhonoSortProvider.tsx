"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { SortKey } from "@/modules/phono/lib/catalog-sort";
import {
  DEFAULT_CATALOG_SORTS,
  type CatalogSorts,
} from "@/modules/phono/lib/player-queue";

export type SortScope = keyof CatalogSorts;

interface PhonoSortContextValue {
  sorts: CatalogSorts;
  setSort: (scope: SortScope, key: SortKey) => void;
}

const PhonoSortContext = createContext<PhonoSortContextValue | null>(null);

export function usePhonoSort(): PhonoSortContextValue {
  const ctx = useContext(PhonoSortContext);
  if (!ctx) {
    throw new Error(
      "usePhonoSort doit être utilisé à l'intérieur d'un <PhonoSortProvider>."
    );
  }
  return ctx;
}

const STORAGE_KEY = "phono-catalog-sorts";

/**
 * Ordre d'affichage des trois onglets du catalogue.
 *
 * Vit dans un contexte plutôt que dans chaque onglet parce que le lecteur en a
 * besoin lui aussi : sa file suit l'ordre affiché, et il est monté dans le
 * layout, hors de la page Catalogue. Passer par `useLocalStorage` de part et
 * d'autre n'aurait pas suffi — ce hook ne propage rien entre ses instances,
 * si bien que changer le tri n'aurait réordonné la file qu'au rechargement
 * suivant.
 */
export function PhonoSortProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorage<Partial<CatalogSorts>>(
    STORAGE_KEY,
    DEFAULT_CATALOG_SORTS
  );

  // Le contenu de localStorage n'est pas fiable : il peut dater d'une version
  // où une clé de tri existait encore (« status », retiré depuis).
  const sorts = useMemo<CatalogSorts>(
    () => ({ ...DEFAULT_CATALOG_SORTS, ...(stored ?? {}) }),
    [stored]
  );

  const setSort = useCallback(
    (scope: SortScope, key: SortKey) => {
      setStored((prev) => ({ ...DEFAULT_CATALOG_SORTS, ...prev, [scope]: key }));
    },
    [setStored]
  );

  const value = useMemo(() => ({ sorts, setSort }), [sorts, setSort]);

  return (
    <PhonoSortContext.Provider value={value}>
      {children}
    </PhonoSortContext.Provider>
  );
}

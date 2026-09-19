"use client";

import { useEffect, useState } from "react";

/**
 * Nombre de colonnes actuellement affichées par la grille des albums.
 *
 * Les seuils reproduisent exactement les classes de `AlbumsTab`
 * (`sm:grid-cols-2 lg:grid-cols-3`). Il faut le connaître en JS pour savoir où
 * s'arrête la ligne d'un album : le panneau déplié s'insère à cette frontière,
 * et une frontière de ligne n'est pas exprimable en CSS seul.
 *
 * Même pattern d'écoute que `DesktopOnlyGuard` — `matchMedia` plutôt qu'un
 * écouteur `resize`, qui se déclencherait à chaque pixel.
 */
const QUERIES: { query: string; columns: number }[] = [
  { query: "(min-width: 1024px)", columns: 3 },
  { query: "(min-width: 640px)", columns: 2 },
];

export function useAlbumGridColumns(): number {
  // Démarre à 3 : c'est la grille du desktop, le seul format que l'app shell
  // sert vraiment (voir `DesktopOnlyGuard`). Une valeur fausse pendant le
  // premier rendu ne déplacerait de toute façon que le point d'insertion du
  // panneau, jamais la liste elle-même.
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const lists = QUERIES.map((q) => ({
      list: window.matchMedia(q.query),
      columns: q.columns,
    }));
    const update = () =>
      setColumns(lists.find(({ list }) => list.matches)?.columns ?? 1);

    update();
    lists.forEach(({ list }) => list.addEventListener("change", update));
    return () =>
      lists.forEach(({ list }) => list.removeEventListener("change", update));
  }, []);

  return columns;
}

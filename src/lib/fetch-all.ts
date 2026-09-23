/**
 * Lecture complète d'une table, page par page.
 *
 * Supabase plafonne une réponse à 1 000 lignes (réglage « Max rows » de l'API).
 * Au-delà, un `select("*")` renvoie les 1 000 premières **sans erreur** : les
 * suivantes disparaissent de l'interface, sans que rien ne le signale. C'est
 * l'utilisateur le plus actif qui le découvre, pas nous.
 *
 * `page` doit reconstruire la requête à chaque appel et finir par
 * `.range(from, to)`. Son tri doit être **total** (terminer par `id`), sinon
 * deux pages peuvent se chevaucher ou sauter des lignes à valeurs égales.
 *
 *   fetchAll((from, to) =>
 *     supabase.from("user_tasks").select("*")
 *       .order("created_at").order("id").range(from, to))
 */
export const FETCH_ALL_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = FETCH_ALL_PAGE_SIZE
): Promise<{ data: T[]; error: PageResult<T>["error"] }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    // Une page en échec invalide tout : une liste partielle présentée comme
    // complète est exactement le défaut que ce helper corrige.
    if (error) return { data: [], error };
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) return { data: rows, error: null };
  }
}

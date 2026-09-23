import type { Person, SplitEntry, Work } from "@/lib/sidekick-store";
import { computeKey, hasExternalPublisher, type SacemKey } from "./sacem-keys";
import { isAuthorRole, isMusicRole, personDisplayName, roleLabel, PERSON_COLORS_HEX, PUBLISHER_COLOR } from "./work-fields";

export type RightsWork = Pick<Work, "persons" | "splitsAuthors" | "splitsComposers" | "selfPublished" | "externalPublishers">;

export interface RightsShare {
  key: string;
  label: string;
  kind: "person" | "publisher";
  /** Rôles de la personne, ou « Éditeur ». */
  detail: string;
  colorHex: string;
  depPct: number;
  drmPct: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Parts effectives d'une catégorie. Une liste vide est le mode « équitable » :
 * parts égales entre les personnes éligibles. L'ancienne version lisait la
 * liste vide comme « personne », et les camemberts restaient vides.
 */
export function effectiveSplits(entries: SplitEntry[], eligible: Person[]): SplitEntry[] {
  const ids = new Set(eligible.map((p) => p.id));
  const kept = entries.filter((e) => ids.has(e.personId) && e.pct > 0);
  if (kept.length > 0) return kept;
  if (eligible.length === 0) return [];
  return eligible.map((p) => ({ personId: p.id, pct: 100 / eligible.length }));
}

/** Parts DEP et DRM de chaque ayant droit, en pourcentage de l'œuvre entière. */
export function rightsShares(work: RightsWork): RightsShare[] {
  const hasPublisher = hasExternalPublisher(work);
  const dep = computeKey("dep", work.persons, hasPublisher);
  const drm = computeKey("drm", work.persons, hasPublisher);

  const shares = new Map<string, RightsShare>();
  work.persons.forEach((p, i) =>
    shares.set(p.id, {
      key: p.id,
      label: personDisplayName(p),
      kind: "person",
      detail: p.roles.map(roleLabel).join(", "),
      colorHex: PERSON_COLORS_HEX[i % PERSON_COLORS_HEX.length],
      depPct: 0,
      drmPct: 0,
    }),
  );

  const credit = (entries: SplitEntry[], field: keyof SacemKey) => {
    const total = entries.reduce((s, e) => s + e.pct, 0) || 1;
    for (const e of entries) {
      const s = shares.get(e.personId);
      if (!s) continue;
      s.depPct += (e.pct / total) * dep[field];
      s.drmPct += (e.pct / total) * drm[field];
    }
  };

  const authors = work.persons.filter(isAuthorRole);
  credit(effectiveSplits(work.splitsAuthors, authors), "authors");

  const music = work.persons.filter(isMusicRole);
  const custom = work.splitsComposers.some((e) => e.pct > 0);
  if (custom) {
    // Parts personnalisées : la catégorie « Compositeurs & Arrangeurs » est
    // répartie d'un bloc, comme l'utilisateur l'a saisie.
    const merged = effectiveSplits(work.splitsComposers, music);
    const total = merged.reduce((s, e) => s + e.pct, 0) || 1;
    for (const e of merged) {
      const s = shares.get(e.personId);
      if (!s) continue;
      s.depPct += (e.pct / total) * (dep.composers + dep.arrangers);
      s.drmPct += (e.pct / total) * (drm.composers + drm.arrangers);
    }
  } else {
    const composers = work.persons.filter((p) => p.roles.includes("composer"));
    const arrangers = work.persons.filter((p) => p.roles.includes("arranger"));
    if (composers.length > 0) {
      credit(effectiveSplits([], composers), "composers");
      credit(effectiveSplits([], arrangers), "arrangers");
    } else {
      // Arrangeur sans compositeur : compté comme compositeur (voir computeKey).
      credit(effectiveSplits([], arrangers), "composers");
    }
  }

  if (hasPublisher) {
    const pubs = work.externalPublishers;
    const total = pubs.reduce((s, p) => s + p.pct, 0);
    pubs.forEach((pub) => {
      const w = total > 0 ? pub.pct / total : 1 / pubs.length;
      shares.set(`pub:${pub.id}`, {
        key: `pub:${pub.id}`,
        label: pub.name || "Éditeur",
        kind: "publisher",
        detail: pub.coad ? `Éditeur · ${pub.coad}` : "Éditeur",
        colorHex: PUBLISHER_COLOR,
        depPct: w * dep.publishers,
        drmPct: w * drm.publishers,
      });
    });
  }

  return [...shares.values()]
    .map((s) => ({ ...s, depPct: r2(s.depPct), drmPct: r2(s.drmPct) }))
    .filter((s) => s.depPct > 0 || s.drmPct > 0);
}

/** Les parts personnalisées totalisent-elles 100 dans chaque catégorie ? Une catégorie vide est équitable, donc valide. */
export function splitsValid(work: RightsWork): boolean {
  const ok = (entries: SplitEntry[], eligible: Person[]) => {
    if (eligible.length === 0 || !entries.some((e) => e.pct > 0)) return true;
    const ids = new Set(eligible.map((p) => p.id));
    const sum = entries.filter((e) => ids.has(e.personId)).reduce((s, e) => s + e.pct, 0);
    return Math.abs(sum - 100) < 0.01;
  };
  const pubOk =
    !hasExternalPublisher(work) ||
    work.externalPublishers.every((p) => !p.pct) ||
    Math.abs(work.externalPublishers.reduce((s, p) => s + p.pct, 0) - 100) < 0.01;
  return ok(work.splitsAuthors, work.persons.filter(isAuthorRole)) && ok(work.splitsComposers, work.persons.filter(isMusicRole)) && pubOk;
}

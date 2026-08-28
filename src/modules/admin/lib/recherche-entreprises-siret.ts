import { siretDigitsOnly } from "@/modules/admin/lib/siret";

/** Champs renvoyés uniquement s’ils contiennent une valeur exploitable (pas masque / vide). */
export type AnnuairePrefillPayload = {
  siret: string;
  nom?: string;
  ape?: string;
  addressLine?: string;
  addressPostal?: string;
  addressCity?: string;
  addressCountry?: string;
  dateCreationIso?: string;
};

export type AnnuaireLookupResult =
  | { ok: true; data: AnnuairePrefillPayload }
  | { ok: false; reason: "not_found" | "non_diffusible" | "no_exploitable_data" };

type EtablissementApi = {
  siret?: string;
  activite_principale?: string | null;
  adresse?: string | null;
  numero_voie?: string | null;
  type_voie?: string | null;
  libelle_voie?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  date_creation?: string | null;
  statut_diffusion_etablissement?: string | null;
};

type ResultatApi = {
  nom_raison_sociale?: string | null;
  nom_complet?: string | null;
  statut_diffusion?: string | null;
  siege?: EtablissementApi | null;
  matching_etablissements?: EtablissementApi[] | null;
};

/** O = diffusion ouverte ; P = partielle ; N = non diffusible (à ignorer pour le pré-remplissage). */
function isNonDiffusible(code: string | null | undefined): boolean {
  return String(code ?? "")
    .trim()
    .toUpperCase() === "N";
}

function isMaskedOrPlaceholder(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const u = t.toUpperCase();
  /** L’API peut écrire NON-DIFFUSIBLE (tirets) ou NON DIFFUSIBLE (espaces). */
  const spaced = u.replace(/-/g, " ");
  if (u === "[ND]" || u === "ND") return true;
  if (spaced.includes("NON DIFFUSIBLE")) return true;
  if (spaced.includes("DIFFUSION NON OUVERTE")) return true;
  if (spaced.includes("CONFIDENTIEL")) return true;
  if (/^\[[^\]]+\]$/.test(t)) return true;
  return false;
}

function sanitizeNom(raw: string | undefined | null): string | undefined {
  const v =
    (raw && String(raw).trim()) ||
    "";
  if (!v || isMaskedOrPlaceholder(v)) return undefined;
  return v;
}

/** Code NAF / APE attendu : NN.NNZ */
function sanitizeApe(raw: string | undefined | null): string | undefined {
  const v = raw && String(raw).trim();
  if (!v || isMaskedOrPlaceholder(v)) return undefined;
  if (!/^\d{2}\.\d{2}[A-Z]$/.test(v)) return undefined;
  return v;
}

function sanitizeGeo(raw: string | undefined | null): string | undefined {
  const v = raw && String(raw).trim();
  if (!v || isMaskedOrPlaceholder(v)) return undefined;
  return v;
}

function formatVoie(e: EtablissementApi): string | undefined {
  const parts = [e.numero_voie, e.type_voie, e.libelle_voie].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (parts && !isMaskedOrPlaceholder(parts)) return parts;
  if (e.adresse) {
    const m = e.adresse.match(/^(.+?)\s+(\d{5})\s+(.+)$/);
    const cand = m?.[1]?.trim();
    if (cand && !isMaskedOrPlaceholder(cand)) return cand;
    const fallback = e.adresse.replace(/\s*\d{5}\s*.+$/, "").trim();
    if (fallback && !isMaskedOrPlaceholder(fallback)) return fallback;
  }
  return undefined;
}

function pickEtablissement(row: ResultatApi, digits14: string): EtablissementApi | null {
  const siege = row.siege;
  if (siege?.siret && siretDigitsOnly(siege.siret) === digits14) return siege;
  const hit = row.matching_etablissements?.find((ex) => ex.siret && siretDigitsOnly(ex.siret) === digits14);
  return hit ?? null;
}

/** Construit le pré-remplissage uniquement à partir de champs jugés exploitables (hors contrôle diffusion). */
function buildExploitablePayload(row: ResultatApi, etab: EtablissementApi, digits14: string): AnnuairePrefillPayload | null {
  const nom =
    sanitizeNom(row.nom_raison_sociale) ??
    sanitizeNom(row.nom_complet);

  const ape = sanitizeApe(etab.activite_principale);

  const addressLine = formatVoie(etab);
  const addressPostal = sanitizeGeo(etab.code_postal);
  const addressCity = sanitizeGeo(etab.libelle_commune);

  let dateCreationIso: string | undefined;
  if (etab.date_creation && /^\d{4}-\d{2}-\d{2}$/.test(etab.date_creation)) {
    dateCreationIso = etab.date_creation;
  }

  const data: AnnuairePrefillPayload = { siret: digits14 };
  if (nom) data.nom = nom;
  if (ape) data.ape = ape;
  if (addressLine) data.addressLine = addressLine;
  if (addressPostal) data.addressPostal = addressPostal;
  if (addressCity) data.addressCity = addressCity;
  if (addressPostal || addressCity || addressLine) {
    data.addressCountry = "France";
  }

  if (dateCreationIso) data.dateCreationIso = dateCreationIso;

  const hasMoreThanSiret =
    Boolean(data.nom) ||
    Boolean(data.ape) ||
    Boolean(data.addressLine) ||
    Boolean(data.addressPostal) ||
    Boolean(data.addressCity) ||
    Boolean(data.dateCreationIso);

  if (!hasMoreThanSiret) return null;

  return data;
}

/** Interprète la réponse JSON de recherche-entreprises.api.gouv.fr pour un SIRET donné. */
export function mapRechercheEntreprisesJson(json: unknown, siretQueryDigits: string): AnnuaireLookupResult {
  const digits14 = siretDigitsOnly(siretQueryDigits);
  if (digits14.length !== 14) return { ok: false, reason: "not_found" };

  if (!json || typeof json !== "object") return { ok: false, reason: "not_found" };
  const results = (json as { results?: unknown }).results;
  if (!Array.isArray(results)) return { ok: false, reason: "not_found" };

  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const row = item as ResultatApi;
    const etab = pickEtablissement(row, digits14);
    if (!etab) continue;

    if (isNonDiffusible(row.statut_diffusion ?? undefined)) {
      return { ok: false, reason: "non_diffusible" };
    }
    if (isNonDiffusible(etab.statut_diffusion_etablissement ?? undefined)) {
      return { ok: false, reason: "non_diffusible" };
    }

    const raw = buildExploitablePayload(row, etab, digits14);
    if (!raw) return { ok: false, reason: "no_exploitable_data" };
    return { ok: true, data: raw };
  }
  return { ok: false, reason: "not_found" };
}

import nafRaw from "@/modules/admin/data/naf-codes-fr.json";

/**
 * NAF rév. 2 (codes APE) — données issues du jeu « Codes NAF INSEE »
 * (Métropole de Lyon / INSEE), ressource all.json.
 */
export type NafEntry = { code: string; label: string };

export const NAF_CODES_FR: NafEntry[] = nafRaw;

function normalizeApeCodeKey(code: string): string {
  return code.trim().toUpperCase().replace(/\./g, "").replace(/\s/g, "");
}

const CODE_TO_LABEL = new Map<string, string>(
  NAF_CODES_FR.map((e) => [normalizeApeCodeKey(e.code), e.label])
);

export function getNafLabelForCode(stored: string): string | undefined {
  const k = normalizeApeCodeKey(stored);
  if (!k) return undefined;
  return CODE_TO_LABEL.get(k);
}

/** Code NAF officiel avec points (ex. 90.01Z), si présent dans la nomenclature. */
export function getCanonicalNafCode(stored: string): string | undefined {
  const k = normalizeApeCodeKey(stored);
  if (!k) return undefined;
  return NAF_CODES_FR.find((e) => normalizeApeCodeKey(e.code) === k)?.code;
}

/** Affichage fiche liste : « N°APE - libellé » si le code est connu. */
export function formatApeDisplay(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const label = getNafLabelForCode(t);
  const code = getCanonicalNafCode(t) ?? t;
  return label ? `${code} - ${label}` : t;
}

export function filterNafCodes(query: string): NafEntry[] {
  const raw = query.trim();
  if (!raw) return NAF_CODES_FR;

  const qLower = raw.toLowerCase();
  const qCode = normalizeApeCodeKey(raw).toLowerCase();

  return NAF_CODES_FR.filter((e) => {
    const codeFlat = normalizeApeCodeKey(e.code).toLowerCase();
    return (
      codeFlat.includes(qCode) ||
      e.code.toLowerCase().includes(qLower) ||
      e.label.toLowerCase().includes(qLower)
    );
  });
}

export function formatApeOptionLabel(entry: NafEntry): string {
  return `${entry.code} - ${entry.label}`;
}

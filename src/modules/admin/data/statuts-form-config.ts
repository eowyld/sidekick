import type { AdminStatusType } from "@/lib/sidekick-store";

export const STATUS_TYPES: { value: AdminStatusType; label: string }[] = [
  { value: "auto_entrepreneur", label: "Auto-Entrepreneur" },
  { value: "association_1901", label: "Association 1901" },
  { value: "intermittent", label: "Intermittent du spectacle" },
  { value: "artiste_auteur", label: "Artiste-Auteur" },
  { value: "sasu", label: "SASU" },
];

export type StatusFieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  advanced?: boolean;
  /** Champ rechercheable liste NAF / APE (France). */
  variant?: "text" | "ape" | "ae_vat_regime" | "ae_vat_number" | "intermittent_annexe";
};

/** Régime franchise : pas de N° TVA côté formulaire auto-entrepreneur. */
export const AE_VAT_REGIME_FRANCHISE_BASE = "franchise_base";

const AE_VAT_DEPRECATED_SLUG = "tva_encaissements";

/** Valeur sentinelle Radix (pas de chaîne vide sur SelectItem). */
export const AE_VAT_REGIME_NONE = "__ae_vat_none__";

export type AeVatRegimeOption = {
  value: string;
  /** Champ fermé, cartes — sans précisions entre parenthèses. */
  shortLabel: string;
  /** Liste déroulante — libellé complet. */
  listLabel: string;
};

/** Régimes TVA courants pour une micro / auto-entreprise (France). */
export const AE_VAT_REGIME_OPTIONS: AeVatRegimeOption[] = [
  {
    value: AE_VAT_REGIME_NONE,
    shortLabel: "Non renseigné",
    listLabel: "Non renseigné",
  },
  {
    value: "franchise_base",
    shortLabel: "Franchise en base de TVA",
    listLabel: "Franchise en base de TVA (pas de TVA facturée)",
  },
  {
    value: "reel_simplifie",
    shortLabel: "Réel simplifié",
    listLabel: "Assujetti — réel simplifié",
  },
  {
    value: "reel_normal",
    shortLabel: "Réel normal",
    listLabel: "Assujetti — réel normal",
  },
];

const AE_VAT_KNOWN_VALUES = new Set(
  AE_VAT_REGIME_OPTIONS.map((o) => o.value).filter((v) => v !== AE_VAT_REGIME_NONE),
);

const LEGACY_PREFIX = "legacy:";

function normalizeLegacyAeVatRegimeText(text: string): string | null {
  const lower = text.toLowerCase();
  if (/franchise|non assujetti|pas de tva|exonération|exoneration/.test(lower)) {
    return "franchise_base";
  }
  if (/réel simpl|réel\s+simpl|reel simpl|reel\s+simpl|\brs\b|ca3/.test(lower)) {
    return "reel_simplifie";
  }
  if (/réel normal|réel\s+normal|reel normal|reel\s+normal|\brn\b/.test(lower)) {
    return "reel_normal";
  }
  if (/encaissement/.test(lower)) return "reel_simplifie";
  return null;
}

/** Valeur du Select à partir du stockage profil. */
export function aeVatRegimeToSelectValue(stored: string): string {
  const t = stored.trim();
  if (!t) return AE_VAT_REGIME_NONE;
  if (t === AE_VAT_DEPRECATED_SLUG) return "reel_simplifie";
  if (AE_VAT_KNOWN_VALUES.has(t)) return t;
  const mapped = normalizeLegacyAeVatRegimeText(t);
  if (mapped) return mapped;
  return `${LEGACY_PREFIX}${encodeURIComponent(t)}`;
}

/** Stockage profil à partir de la valeur du Select. */
export function aeVatRegimeFromSelectValue(selectValue: string): string {
  if (selectValue === AE_VAT_REGIME_NONE) return "";
  if (selectValue.startsWith(LEGACY_PREFIX)) {
    try {
      return decodeURIComponent(selectValue.slice(LEGACY_PREFIX.length));
    } catch {
      return selectValue.slice(LEGACY_PREFIX.length);
    }
  }
  return selectValue;
}

/** Libellé court pour champ fermé, cartes (sans mentions entre parenthèses). */
export function formatAeVatRegimeDisplay(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  if (t === AE_VAT_DEPRECATED_SLUG) {
    return AE_VAT_REGIME_OPTIONS.find((o) => o.value === "reel_simplifie")?.shortLabel ?? "Réel simplifié";
  }
  const opt = AE_VAT_REGIME_OPTIONS.find((o) => o.value === t);
  if (opt && opt.value !== AE_VAT_REGIME_NONE) return opt.shortLabel;
  return t;
}

export function isAeFranchiseBaseVatRegime(profileTvaRegime: string | undefined): boolean {
  return profileTvaRegime?.trim() === AE_VAT_REGIME_FRANCHISE_BASE;
}

/** Libellé affiché sur le sélecteur fermé à partir de la valeur Radix. */
export function aeVatRegimeTriggerLabel(selectValue: string): string {
  if (selectValue.startsWith(LEGACY_PREFIX)) {
    return aeVatRegimeFromSelectValue(selectValue);
  }
  const opt = AE_VAT_REGIME_OPTIONS.find((o) => o.value === selectValue);
  return opt?.shortLabel ?? "";
}

/** Adresse postale commune à tous les types de statut (stockée dans `data.profile`). */
export const STATUS_ADDRESS_FIELDS: StatusFieldConfig[] = [
  { key: "addressLine", label: "Voie et numéro", placeholder: "12 rue Example, bât. B…" },
  { key: "addressPostal", label: "Code postal", placeholder: "75011" },
  { key: "addressCity", label: "Ville", placeholder: "Paris" },
  { key: "addressCountry", label: "Pays", placeholder: "France" },
];

export function formatStatusAddressLines(profile: Record<string, string>): string[] {
  const line = profile.addressLine?.trim();
  const postal = profile.addressPostal?.trim();
  const city = profile.addressCity?.trim();
  const country = profile.addressCountry?.trim();
  const line2 = [postal, city].filter(Boolean).join(" ");
  const out: string[] = [];
  if (line) out.push(line);
  if (line2) out.push(line2);
  if (country) out.push(country);
  return out;
}

export function hasStatusAddress(profile: Record<string, string>): boolean {
  return formatStatusAddressLines(profile).length > 0;
}

export const STATUS_FIELDS: Record<string, StatusFieldConfig[]> = {
  auto_entrepreneur: [
    { key: "siret", label: "SIRET", placeholder: "14 chiffres" },
    { key: "ape", label: "Code APE (NAF)", variant: "ape" },
    { key: "tvaRegime", label: "Régime TVA", variant: "ae_vat_regime" },
    {
      key: "vatNumber",
      label: "N° TVA intracommunautaire",
      placeholder: "FR…",
      variant: "ae_vat_number",
    },
    { key: "iban", label: "IBAN", placeholder: "FR…", advanced: true },
    { key: "bic", label: "BIC", placeholder: "Ex. BNPAFRPPXXX", advanced: true },
    { key: "swift", label: "SWIFT", placeholder: "Souvent identique au BIC", advanced: true },
  ],
  association_1901: [
    { key: "rna", label: "Numéro RNA", placeholder: "W..." },
    { key: "siret", label: "SIRET", placeholder: "14 chiffres" },
    { key: "ape", label: "Code APE (NAF)", variant: "ape" },
    { key: "tvaRegime", label: "Régime TVA", variant: "ae_vat_regime" },
    {
      key: "vatNumber",
      label: "N° TVA intracommunautaire",
      placeholder: "FR…",
      variant: "ae_vat_number",
    },
    { key: "president", label: "Président·e" },
    { key: "iban", label: "IBAN", placeholder: "FR…", advanced: true },
    { key: "bic", label: "BIC", placeholder: "Ex. BNPAFRPPXXX", advanced: true },
    { key: "swift", label: "SWIFT", placeholder: "Souvent identique au BIC", advanced: true },
  ],
  sasu: [
    { key: "siret", label: "SIRET" },
    { key: "ape", label: "Code APE (NAF)", variant: "ape" },
    { key: "vatNumber", label: "N° TVA intracommunautaire" },
    { key: "rcs", label: "RCS de rattachement" },
    { key: "iban", label: "IBAN", placeholder: "FR…", advanced: true },
    { key: "bic", label: "BIC", placeholder: "Ex. BNPAFRPPXXX", advanced: true },
    { key: "swift", label: "SWIFT", placeholder: "Souvent identique au BIC", advanced: true },
    { key: "capital", label: "Capital social", advanced: true },
  ],
  intermittent: [
    { key: "annex", label: "Annexe", variant: "intermittent_annexe" },
    { key: "nir", label: "N° de sécurité sociale (NIR)", placeholder: "15 chiffres" },
    { key: "franceTravailId", label: "Identifiant France Travail", placeholder: "N° de dossier" },
    { key: "audiensId", label: "Référence Audiens", advanced: true },
    { key: "congesSpectaclesRef", label: "Référence CMSA / Congés Spectacles", advanced: true },
    { key: "afdasRef", label: "Référence AFDAS (formation)", advanced: true },
  ],
  artiste_auteur: [
    { key: "siret", label: "SIRET artiste-auteur" },
    { key: "urssafRef", label: "Référence URSSAF Limousin" },
    { key: "activityStart", label: "Début activité" },
    { key: "civilSocieties", label: "Sociétés civiles", placeholder: "SACEM, SACD..." },
    { key: "ircecRef", label: "Référence IRCEC", advanced: true },
  ],
};

export function typeLabel(value: string): string {
  return STATUS_TYPES.find((t) => t.value === value)?.label ?? value;
}

/** Premier champ identité (`nom`) : libellé, aide à la saisie, description de section selon le type. */
export function getStatusIdentityNameField(type: AdminStatusType): {
  label: string;
  placeholder: string;
  identitySectionDescription: string;
} {
  if (type === "auto_entrepreneur") {
    return {
      label: "Raison sociale",
      placeholder:
        "Nom de l’entreprise individuelle ou prénom + nom tels qu’inscrits auprès de l’administration",
      identitySectionDescription:
        "Identification administrative : les mêmes mentions qu’en déclaration (impôts, cotisations). Utilisées dans Sidekick et le dossier Documents Admin — pas un libellé de convenance.",
    };
  }
  if (type === "association_1901") {
    return {
      label: "Nom de l’association",
      placeholder: "Nom officiel tel qu’il figure dans les statuts et en préfecture",
      identitySectionDescription:
        "Nom officiel de l’association (statuts déposés en préfecture). Utilisé dans Sidekick et le dossier Documents Admin.",
    };
  }
  if (type === "intermittent") {
    return {
      label: "Libellé de la carte",
      placeholder: "Ex. Intermittence — Annexe 10",
      identitySectionDescription:
        "Nom d’affichage de ta situation d’intermittent dans Sidekick. Le suivi des heures et cachets se fait dans Revenus > Intermittence.",
    };
  }
  return {
    label: "Nom du statut",
    placeholder: "Ex. Mon association, Ma SASU, Carte intermittent…",
    identitySectionDescription: "Nom affiché dans Sidekick et dossier Documents Admin.",
  };
}

export function isStructureType(value: string): boolean {
  return value === "auto_entrepreneur" || value === "association_1901" || value === "sasu";
}

/** Section « avancée » : titre selon le type (banque vs complément générique). */
export function getAdvancedSectionMeta(type: AdminStatusType): { title: string; description: string } {
  if (type === "auto_entrepreneur" || type === "sasu" || type === "association_1901") {
    return {
      title: "Informations bancaires",
      description:
        type === "sasu"
          ? "IBAN, BIC et SWIFT, puis capital social."
          : type === "association_1901"
          ? "Coordonnées bancaires de l'association (compte courant associatif). Aussi : Trésorier·e, licence spectacle."
          : "Coordonnées bancaires liées à ce statut : IBAN, BIC et SWIFT (souvent le même code que le BIC).",
    };
  }
  if (type === "intermittent") {
    return {
      title: "Références complémentaires",
      description: "Audiens, CMSA et AFDAS — facultatif, utile pour centraliser tes identifiants.",
    };
  }
  return {
    title: "Détails complémentaires",
    description: "Facultatif — références secondaires et informations annexes.",
  };
}

const ALLOWED_TYPES = new Set(STATUS_TYPES.map((t) => t.value));

/**
 * Valeur stockée (Supabase, anciens types retirés de l’UI) → type canonique pour l’app.
 * Les statuts « salarié » / « autre » deviennent micro-entreprise à l’affichage ; une sauvegarde persiste le nouveau type.
 */
export function normalizeStoredAdminStatusType(value: string): AdminStatusType {
  if (value === "sas_sasu" || value === "sarl_eurl") return "sasu";
  if (value === "salarie" || value === "autre") return "auto_entrepreneur";
  if (ALLOWED_TYPES.has(value as AdminStatusType)) return value as AdminStatusType;
  return "auto_entrepreneur";
}


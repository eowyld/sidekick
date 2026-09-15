import type { AdminStatusType } from "@/lib/sidekick-store";

export type ProcedureRecurrence =
  | "none"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "biannual";

/** Cadence de déclaration auto-entrepreneur — la seule question posée à l'artiste. */
export type AeCadence = "monthly" | "quarterly";

/**
 * Comment poser la première échéance d'une démarche.
 *
 * `anniversary` dépend d'une date saisie par l'artiste : sans elle, la démarche
 * n'est pas proposée (voir `isTemplateAvailable`).
 */
export type ProcedureFirstDue =
  | { kind: "inDays"; days: number }
  | { kind: "fixedAnnual"; month: number; day: number }
  | { kind: "anniversary" }
  | { kind: "everyTwoYears" };

export interface AdminProcedureTemplate {
  key: string;
  statusType: AdminStatusType;
  label: string;
  organisme?: string;
  recurrence: ProcedureRecurrence;
  firstDue: ProcedureFirstDue;
  /** Cochée par défaut dans la liste proposée à la création du statut. */
  defaultChecked: boolean;
  /**
   * Une phrase sous la case, en langage clair. Décrit *quand* et *auprès de qui*,
   * jamais ce que l'artiste doit déclarer — Sidekick pose des rappels, il ne
   * fait pas de conseil fiscal.
   */
  hint?: string;
  /** Le libellé et la récurrence suivent la cadence choisie (auto-entrepreneur). */
  followsAeCadence?: boolean;
}

/**
 * Catalogue des démarches proposées à la création d'un statut.
 *
 * Ajouter une démarche = ajouter une entrée ici, rien d'autre à toucher :
 * `procedure-builder.ts` la construit et la synchronise, `StatutEditPage`
 * l'affiche comme une case à cocher.
 */
export const ADMIN_PROCEDURE_TEMPLATES: AdminProcedureTemplate[] = [
  // ── Auto-entrepreneur ─────────────────────────────────────────────────────
  {
    key: "ae_declaration_ca",
    statusType: "auto_entrepreneur",
    label: "Déclaration de chiffre d'affaires",
    organisme: "URSSAF",
    recurrence: "quarterly",
    firstDue: { kind: "inDays", days: 45 },
    defaultChecked: true,
    followsAeCadence: true,
    hint: "Sur ton espace autoentrepreneur.urssaf.fr, à la cadence choisie ci-dessus.",
  },
  {
    key: "ae_cfe",
    statusType: "auto_entrepreneur",
    label: "Vérifier et payer la CFE",
    organisme: "Impôts",
    recurrence: "annual",
    firstDue: { kind: "inDays", days: 180 },
    defaultChecked: true,
    hint: "Cotisation foncière des entreprises, une fois par an sur impots.gouv.fr.",
  },
  {
    key: "ae_versement_liberatoire",
    statusType: "auto_entrepreneur",
    label: "Versement libératoire d'impôt sur le revenu",
    organisme: "Impôts / URSSAF",
    recurrence: "quarterly",
    firstDue: { kind: "inDays", days: 45 },
    defaultChecked: false,
    followsAeCadence: true,
    hint: "À cocher seulement si tu as opté pour le versement libératoire.",
  },

  // ── Association 1901 ──────────────────────────────────────────────────────
  {
    key: "assoc_ago",
    statusType: "association_1901",
    label: "Assemblée Générale Ordinaire (AGO)",
    organisme: "Association",
    recurrence: "annual",
    firstDue: { kind: "fixedAnnual", month: 6, day: 30 },
    defaultChecked: true,
    hint: "On la place au 30 juin, déplace-la si tes statuts prévoient une autre date.",
  },
  {
    key: "assoc_bureau_renewal",
    statusType: "association_1901",
    label: "Renouvellement / déclaration du bureau en préfecture",
    organisme: "Préfecture",
    recurrence: "annual",
    firstDue: { kind: "fixedAnnual", month: 6, day: 30 },
    defaultChecked: false,
    hint: "Si ton bureau est renouvelé chaque année en AGO.",
  },
  {
    key: "assoc_rapport_activite",
    statusType: "association_1901",
    label: "Compte rendu financier et bilan moral",
    organisme: "Association",
    recurrence: "annual",
    firstDue: { kind: "fixedAnnual", month: 6, day: 30 },
    defaultChecked: false,
    hint: "En général demandé si l'association reçoit des subventions ou emploie des salariés.",
  },

  // ── Intermittent du spectacle ─────────────────────────────────────────────
  {
    key: "intermittent_actualisation",
    statusType: "intermittent",
    label: "Actualisation mensuelle France Travail",
    organisme: "France Travail",
    recurrence: "monthly",
    firstDue: { kind: "inDays", days: 30 },
    defaultChecked: true,
    hint: "Chaque mois, entre le 28 et le 15 du mois suivant.",
  },
  {
    key: "intermittent_507h_check",
    statusType: "intermittent",
    label: "Vérifier les 507 h avant la date anniversaire",
    organisme: "France Travail",
    recurrence: "annual",
    firstDue: { kind: "anniversary" },
    defaultChecked: true,
    hint: "Calée sur ta date anniversaire. Le cumul d'heures se suit dans Revenus > Intermittence.",
  },
  {
    key: "intermittent_conges_spectacles",
    statusType: "intermittent",
    label: "Demander les Congés Spectacles",
    organisme: "Congés Spectacles",
    recurrence: "annual",
    firstDue: { kind: "fixedAnnual", month: 4, day: 30 },
    defaultChecked: false,
    hint: "Si tu es affilié à la caisse des Congés Spectacles.",
  },
  {
    key: "intermittent_medecine_travail",
    statusType: "intermittent",
    label: "Visite médicale — médecine du travail (CMB)",
    organisme: "CMB",
    recurrence: "biannual",
    firstDue: { kind: "everyTwoYears" },
    defaultChecked: false,
    hint: "Tous les deux ans. Déplace la première échéance si ta dernière visite est récente.",
  },
  {
    key: "intermittent_afdas",
    statusType: "intermittent",
    label: "Vérifier / activer les droits AFDAS (formation)",
    organisme: "AFDAS",
    recurrence: "annual",
    firstDue: { kind: "fixedAnnual", month: 9, day: 30 },
    defaultChecked: false,
    hint: "Si tu es inscrit à l'AFDAS pour la formation professionnelle.",
  },
];

export function getTemplatesForStatusType(
  statusType: AdminStatusType
): AdminProcedureTemplate[] {
  return ADMIN_PROCEDURE_TEMPLATES.filter(
    (template) => template.statusType === statusType
  );
}

export function getTemplateByKey(key: string): AdminProcedureTemplate | undefined {
  return ADMIN_PROCEDURE_TEMPLATES.find((template) => template.key === key);
}

/**
 * Une démarche calée sur la date anniversaire n'est proposable que si cette
 * date est renseignée — sinon on n'a pas d'échéance à poser.
 */
export function isTemplateAvailable(
  template: AdminProcedureTemplate,
  options: { anniversaryDate?: string }
): boolean {
  if (template.firstDue.kind === "anniversary") {
    return Boolean(options.anniversaryDate?.trim());
  }
  return true;
}

/** Périodicité en clair, pour la case à cocher et la fiche démarche. */
export function recurrenceLabel(recurrence: ProcedureRecurrence): string {
  switch (recurrence) {
    case "monthly":
      return "tous les mois";
    case "quarterly":
      return "tous les trimestres";
    case "semi_annual":
      return "tous les six mois";
    case "annual":
      return "tous les ans";
    case "biannual":
      return "tous les deux ans";
    case "none":
      return "une seule fois";
  }
}

/** Récurrence effective d'un modèle, une fois la cadence AE appliquée. */
export function templateRecurrence(
  template: AdminProcedureTemplate,
  aeCadence: AeCadence
): ProcedureRecurrence {
  return template.followsAeCadence ? aeCadence : template.recurrence;
}

/** Libellé effectif d'un modèle : la cadence AE est rappelée entre parenthèses. */
export function templateLabel(
  template: AdminProcedureTemplate,
  aeCadence: AeCadence
): string {
  if (!template.followsAeCadence) return template.label;
  const cadence = aeCadence === "monthly" ? "mensuelle" : "trimestrielle";
  return `${template.label} (déclaration ${cadence})`;
}

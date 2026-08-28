import type { AdminStatusType } from "@/lib/sidekick-store";

export type ProcedureRecurrence = "none" | "monthly" | "quarterly" | "semi_annual" | "annual" | "biannual";

export interface AdminProcedureTemplate {
  key: string;
  statusType: AdminStatusType;
  label: string;
  organisme?: string;
  recurrence: ProcedureRecurrence;
  defaultDueInDays: number;
}

export const ADMIN_PROCEDURE_TEMPLATES: AdminProcedureTemplate[] = [
  {
    key: "ae_declaration_ca",
    statusType: "auto_entrepreneur",
    label: "Déclaration de chiffre d'affaires",
    organisme: "URSSAF",
    recurrence: "quarterly",
    defaultDueInDays: 45,
  },
  {
    key: "ae_cfe",
    statusType: "auto_entrepreneur",
    label: "Vérifier et payer la CFE",
    organisme: "Impôts",
    recurrence: "annual",
    defaultDueInDays: 180,
  },
  {
    key: "ae_versement_liberatoire",
    statusType: "auto_entrepreneur",
    label: "Versement libératoire d'impôt sur le revenu",
    organisme: "Impôts / URSSAF",
    recurrence: "quarterly",
    defaultDueInDays: 45,
  },
  {
    key: "asso_ag",
    statusType: "association_1901",
    label: "Préparer l'assemblée générale annuelle",
    organisme: "Association",
    recurrence: "annual",
    defaultDueInDays: 300,
  },
  {
    key: "sasu_tva",
    statusType: "sasu",
    label: "Déclaration de TVA",
    organisme: "Impôts",
    recurrence: "monthly",
    defaultDueInDays: 30,
  },
  {
    key: "intermittent_actualisation",
    statusType: "intermittent",
    label: "Actualisation France Travail",
    organisme: "France Travail",
    recurrence: "monthly",
    defaultDueInDays: 30,
  },
  {
    key: "artiste_auteur_urssaf",
    statusType: "artiste_auteur",
    label: "Déclaration URSSAF artiste-auteur",
    organisme: "URSSAF Limousin",
    recurrence: "annual",
    defaultDueInDays: 180,
  },
];

export function getTemplatesForStatusType(statusType: AdminStatusType): AdminProcedureTemplate[] {
  return ADMIN_PROCEDURE_TEMPLATES.filter((template) => template.statusType === statusType);
}

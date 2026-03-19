/**
 * Types et clés de stockage pour le module Mailing (newsletters).
 * Données persistées en localStorage (clés dédiées).
 */

export const MAILING_STORAGE_KEYS = {
    campaigns: "marketing:mailing:campaigns",
    drafts: "marketing:mailing:drafts",
    contacts: "marketing:mailing:contacts",
    segments: "marketing:mailing:segments"
  } as const;
  
  export interface MailingCampaign {
    id: string;
    name: string;
    dateEnvoi: string; // ISO date
    envoyes: number;
    ouverts: number;
    pctOuverture: number;
    clics: number;
    pctClics: number;
    details?: string;
    /** Objet de l'email */
    subject?: string;
    /** Accroche */
    accroche?: string;
    /** Contenu HTML de l'email */
    contentHtml?: string;
    /** Segments ciblés (contacts à qui envoyer) */
    targetSegmentIds?: string[];
    /** Adresse email d'envoi (Gmail ou Outlook connectée) */
    fromEmail?: string;
  }
  
  export interface MailingContact {
    id: string;
    nom: string;
    prenom: string;
    mail: string;
    dateAjout: string; // ISO date
    segmentIds: string[];
  }
  
  export interface MailingSegment {
    id: string;
    name: string;
  }
  
  export const DEFAULT_SEGMENT_NAME = "Général";
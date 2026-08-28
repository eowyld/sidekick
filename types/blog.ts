export type BlogCategorie =
  | "phono"
  | "edition"
  | "live"
  | "revenus"
  | "admin"
  | "marketing"
  | "contacts"
  | "organisation";

export type BlogNiveau = "debutant" | "intermediaire" | "avance";

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  categorie: BlogCategorie;
  tags: string[];
  module: string;
  date: string;
  readingTime: number;
  niveau: BlogNiveau;
  published: boolean;
  content?: string;
};

export type BlogArticleMeta = Omit<BlogArticle, "content">;

export const CATEGORIE_LABELS: Record<BlogCategorie, string> = {
  phono: "Phonographie",
  edition: "Édition",
  live: "Live & Tournées",
  revenus: "Revenus",
  admin: "Administration",
  marketing: "Marketing",
  contacts: "Réseau",
  organisation: "Organisation",
};

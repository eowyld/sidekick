/**
 * Logo de l'artiste : deux versions facultatives, pour fonds clairs et pour
 * fonds sombres, et un interrupteur par export. Voir CLAUDE.md, section
 * « Identité de l'artiste ».
 *
 * Fonctions pures, partagées par le client et les routes publiques, sauf
 * `fileToLogoDataUrl` qui a besoin du navigateur.
 */

export type LogoVariant = "light" | "dark";

export type ArtistLogo = Record<LogoVariant, string | null>;

export type LogoExports = {
  invoices: boolean;
  technical: boolean;
  listening: boolean;
};

export type LogoTarget = keyof LogoExports;

/** Fond de chaque surface : c'est lui qui choisit la version du logo. */
const TARGET_BACKGROUND: Record<LogoTarget, LogoVariant> = {
  invoices: "light",
  technical: "light",
  listening: "dark",
};

/** Clé absente = affiché, même sémantique que `enabled_modules`. */
export function normalizeLogoExports(raw: Partial<LogoExports> | null | undefined): LogoExports {
  return {
    invoices: raw?.invoices !== false,
    technical: raw?.technical !== false,
    listening: raw?.listening !== false,
  };
}

/**
 * Le logo à poser sur un export, ou `undefined`. Prend la version du fond de
 * la surface et se rabat sur l'autre : un seul logo suffit pour tout.
 */
export function logoFor(
  logo: ArtistLogo,
  exports: Partial<LogoExports> | null | undefined,
  target: LogoTarget
): string | undefined {
  if (!normalizeLogoExports(exports)[target]) return undefined;
  const preferred = TARGET_BACKGROUND[target];
  const other: LogoVariant = preferred === "light" ? "dark" : "light";
  return logo[preferred] || logo[other] || undefined;
}

/**
 * Même interrupteur que `logoFor(…, target)`, mais préfère la version sombre.
 * Pour un fond ponctuellement sombre sur un export par ailleurs clair — le
 * bandeau à la couleur d'accent de la mise en page Affiche de la fiche
 * technique, par exemple.
 */
export function logoForDarkSpot(
  logo: ArtistLogo,
  exports: Partial<LogoExports> | null | undefined,
  target: LogoTarget
): string | undefined {
  if (!normalizeLogoExports(exports)[target]) return undefined;
  return logo.dark || logo.light || undefined;
}

const MAX_LOGO_DIM = 320;

/** Redimensionne une image (320 px au plus) en data URL PNG, transparence gardée. */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  const scale = Math.min(1, MAX_LOGO_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

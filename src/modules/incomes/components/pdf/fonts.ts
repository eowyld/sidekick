import { Font } from "@react-pdf/renderer";

/**
 * Polices disponibles pour le modèle de facture.
 * Les fichiers .ttf sont servis depuis /public/fonts (téléchargés via fontsource).
 * `value` est la clé stockée dans les préférences ; `family` est le nom enregistré
 * auprès de react-pdf et utilisé dans les styles du document.
 */
export const INVOICE_FONTS = [
  { value: "Inter", label: "Inter — sans moderne", family: "Inter" },
  { value: "Montserrat", label: "Montserrat — sans géométrique", family: "Montserrat" },
  { value: "Lora", label: "Lora — serif élégante", family: "Lora" },
] as const;

export type InvoiceFontKey = (typeof INVOICE_FONTS)[number]["value"];

let registered = false;

/** Enregistre toutes les polices auprès de react-pdf (idempotent). */
export function registerInvoiceFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Inter",
    fonts: [
      { src: "/fonts/inter-400.ttf", fontWeight: 400 },
      { src: "/fonts/inter-600.ttf", fontWeight: 600 },
      { src: "/fonts/inter-700.ttf", fontWeight: 700 },
      { src: "/fonts/inter-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "Montserrat",
    fonts: [
      { src: "/fonts/montserrat-400.ttf", fontWeight: 400 },
      { src: "/fonts/montserrat-600.ttf", fontWeight: 600 },
      { src: "/fonts/montserrat-700.ttf", fontWeight: 700 },
      { src: "/fonts/montserrat-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "Lora",
    fonts: [
      { src: "/fonts/lora-400.ttf", fontWeight: 400 },
      { src: "/fonts/lora-600.ttf", fontWeight: 600 },
      { src: "/fonts/lora-700.ttf", fontWeight: 700 },
      { src: "/fonts/lora-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
    ],
  });

  // Évite les césures hasardeuses des libellés longs.
  Font.registerHyphenationCallback((word) => [word]);
}

/** Renvoie la family react-pdf valide pour une clé de police (fallback Inter). */
export function resolveFontFamily(key: string | undefined): string {
  return INVOICE_FONTS.find((f) => f.value === key)?.family ?? "Inter";
}

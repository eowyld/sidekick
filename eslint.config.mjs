import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Next 16 a supprimé `next lint` : le script `npm run lint` échouait en
 * silence, interprétant "lint" comme un chemin de projet. ESLint n'avait donc
 * plus rien vérifié depuis la migration. On repasse par le binaire eslint et
 * la configuration « plate », seul format supporté par ESLint 9.
 */
const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/migrations-archive/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    // Le champ date natif (`<input type="date">`) rend un contrôle du système,
    // clair, au format de la locale du navigateur et impossible à styler : il
    // jurait dans le design sombre. `DatePicker` (src/components/ui) est le
    // seul sélecteur de date du produit.
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='type'][value.value='date']",
          message: "Champ date natif interdit — utilise <DatePicker /> (@/components/ui/date-picker).",
        },
      ],
    },
  },
];

export default config;

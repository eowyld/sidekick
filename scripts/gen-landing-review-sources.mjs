// scripts/gen-landing-review-sources.mjs
//
//   node scripts/gen-landing-review-sources.mjs
//
// Régénère docs/landing-review/04-SOURCES.md : concatène le code des 11
// composants de la landing (ordre d'apparition) + données + pages liées.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = `${ROOT}/docs/landing-review/04-SOURCES.md`;

// Ordre d'apparition sur la page + fichiers de données, puis pages liées.
const LANDING = [
  "src/components/landing/LandingNav.tsx",
  "src/components/landing/Hero.tsx",
  "src/components/landing/ModulesGrid.tsx",
  "src/components/landing/CostComparison.tsx",
  "src/components/landing/ModuleShowcase.tsx",
  "src/components/landing/PainPoints.tsx",
  "src/components/landing/ProductProof.tsx",
  "src/components/landing/Roadmap.tsx",
  "src/components/landing/Pricing.tsx",
  "src/components/landing/SignupCta.tsx",
  "src/components/landing/LandingFooter.tsx",
  "src/components/landing/ProductShot.tsx",
  "src/components/landing/modules-data.ts",
  "src/components/landing/pricing-data.ts",
];

const LINKED = [
  "src/lib/utils.ts",
  "src/components/landing/FaqSection.tsx",
  "app/faq/page.tsx",
  "app/confidentialite/page.tsx",
];

const pageTsx = readFileSync(`${ROOT}/app/page.tsx`, "utf8").trimEnd();

function block(rel) {
  const abs = `${ROOT}/${rel}`;
  const src = readFileSync(abs, "utf8").replace(/\s+$/, "") + "\n";
  const n = src.split("\n").length - 1;
  const lang = rel.endsWith(".ts") ? "ts" : "tsx";
  const name = rel.startsWith("app/")
    ? "/" + rel.slice(4).replace(/\/page\.tsx$/, "") + "  (app/…/page.tsx)"
    : rel.split("/").pop();
  return `## \`${name}\`\n\n${n} lignes — \`${rel}\`\n\n\`\`\`${lang}\n${src}\`\`\`\n`;
}

const today = new Date().toISOString().slice(0, 10);

const head = `# Sources — composants de la landing

Les fichiers de \`src/components/landing/\`, dans l'ordre d'apparition sur la page.
Next.js 16 (App Router) + Tailwind. **Régénéré le ${today}** — reflète l'état
courant du dépôt (postérieur à la revue du 3 septembre).

La page est assemblée dans \`app/page.tsx\` :

\`\`\`tsx
${pageTsx}
\`\`\`

---

`;

const linkedIntro = `---

# Pages & utilitaires liés (hors landing, mais atteignables depuis sa nav / son footer)

- \`src/lib/utils.ts\` — dont \`focusRing\` / \`focusRingInset\`, l'anneau de focus clavier posé sur tous les éléments interactifs nus.
- \`FaqSection.tsx\` + \`app/faq/page.tsx\` — la FAQ, désormais **une page \`/faq\` autonome** (liée depuis la nav et le footer), plus une section de la landing.
- \`app/confidentialite/page.tsx\` — politique de confidentialité, **brouillon** (mentions \`[à compléter]\`), liée depuis le hero et le footer.

`;

const body =
  head +
  LANDING.map(block).join("\n---\n\n") +
  "\n" +
  linkedIntro +
  LINKED.map(block).join("\n---\n\n");

writeFileSync(OUT, body);
console.log(`✓ ${OUT} — ${body.split("\n").length} lignes`);

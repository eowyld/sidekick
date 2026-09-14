// scripts/shots.mjs  —  captures produit pour la landing.
//
//   SHOT_EMAIL=… SHOT_PASSWORD=… node scripts/shots.mjs      (avec npm run dev lancé)
//
// Compte de démo : booking.yoton@gmail.com (seedé via l'onboarding, 3 secteurs
// + données d'exemple). Le script se connecte, refait l'onboarding s'il est
// encore à faire, puis capture le dashboard + les pages Live / Revenus / Édition
// en 3× vers public/images/landing/.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SHOT_EMAIL;
const PASSWORD = process.env.SHOT_PASSWORD;
const DSF = 3;

if (!EMAIL || !PASSWORD) {
  console.error("✗ Définis SHOT_EMAIL et SHOT_PASSWORD (identifiants Supabase).");
  process.exit(1);
}

/**
 * Routes à capturer. `settle` = attente extra (ms). `cropTop` = sélecteur dont
 * le haut sert de bord supérieur (on rogne tout ce qui est au-dessus) — utile
 * quand l'en-tête de page n'apporte rien à la capture.
 */
const VIEWPORT_W = 1440;

const SHOTS = [
  { path: "/dashboard", out: "dashboard.png" },
  // `viewportW` plus étroit → même contenu rendu plus gros dans la capture.
  { path: "/live", out: "live.png", settle: 8000, viewportW: 1200 }, // carte Leaflet : tuiles à charger
  // `cropTopText` : on rogne tout ce qui précède la section contenant ce texte
  // (ici les encarts chiffrés), l'en-tête « Vue d'ensemble » + année n'apporte rien.
  { path: "/incomes", out: "revenus.png", cropTopText: "moyenne / mois" },
  { path: "/edition", out: "edition.png" },
];

mkdirSync("public/images/landing", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: VIEWPORT_W, height: 900 },
  deviceScaleFactor: DSF, // densité : c'est ce qui rend le texte net une fois réduit
  colorScheme: "dark",
});
const page = await ctx.newPage();

// ─── Connexion ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASSWORD);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }),
  page.click('button[type="submit"]'),
]);
console.log("✓ connecté");

// ─── Onboarding (si le compte ne l'a pas encore fait) ─────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
const needsOnboarding = await page
  .getByRole("heading", { name: /te concerne/ })
  .waitFor({ timeout: 6000 })
  .then(() => true)
  .catch(() => false);

if (needsOnboarding) {
  console.log("→ onboarding : sélection des 3 secteurs + données d'exemple");
  const modal = page.locator("div.fixed.inset-0.z-50");
  const sectors = modal.locator("button[aria-pressed]");
  const n = await sectors.count();
  for (let i = 0; i < n; i++) await sectors.nth(i).click();
  await modal.getByRole("button", { name: "Continuer" }).click();
  await modal.getByRole("button", { name: /Remplir avec des exemples/ }).click();
  await page
    .getByRole("heading", { name: /ça ressemble rempli/ })
    .waitFor({ state: "hidden", timeout: 60000 });
  await page.waitForTimeout(3000); // laisse les hooks re-fetch depuis Supabase
  console.log("✓ seed terminé");
}

// Masque le bouton de feedback flottant sur toutes les captures.
const HIDE_CHROME = `*{scrollbar-width:none!important}
  *::-webkit-scrollbar{display:none!important}
  *,*::before,*::after{animation:none!important;transition:none!important}
  button[aria-label="Donner un feedback"]{display:none!important}`;

// ─── Phrase d'accroche : recalage sur l'heure du run ──────────────────────
// L'en-tête du dashboard (« JEUDI · 14h50 ») est calculé en direct ; la phrase
// (« Bonne matinée. » / « Bonne après-midi. » …) vient d'une route mise en
// cache une fois par jour. Sans ce force, une capture d'après-midi hérite du
// salut généré le matin — incohérence pile sur la fonction qu'on met en avant.
{
  const res = await page.request.post(`${BASE}/api/dashboard/hero-phrase`, {
    data: { force: true },
  });
  console.log(
    res.ok()
      ? "✓ phrase d'accroche recalée sur l'heure courante"
      : `✗ recalage phrase d'accroche : HTTP ${res.status()}`,
  );
}

// ─── Captures ─────────────────────────────────────────────────────────────
for (const shot of SHOTS) {
  await page.setViewportSize({ width: shot.viewportW ?? VIEWPORT_W, height: 900 });
  await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_CHROME });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(shot.settle ?? 1500);

  // Capture l'élément <main> entier (au-delà du viewport si besoin), puis on
  // rogne : le bas vide (<main> a une hauteur minimale) et, si `cropTop` est
  // défini, tout ce qui précède ce repère.
  const main = page.locator("main").first();
  const content = page.locator("main > div").first();
  await content.waitFor({ state: "visible", timeout: 10000 });
  const m = await main.boundingBox();
  const c = await content.boundingBox();
  const pad = c.y - m.y; // padding haut de <main>, réutilisé en bas

  let topCss = 0;
  if (shot.cropTopText) {
    topCss = await page.evaluate((txt) => {
      const main = document.querySelector("main");
      const container = main.firstElementChild; // conteneur space-y-* des sections
      const mr = main.getBoundingClientRect();
      // Le plus profond des éléments contenant ce texte (les ancêtres le
      // contiennent aussi via textContent — on veut la feuille).
      const rx = new RegExp(txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matches = [...main.querySelectorAll("*")].filter((e) =>
        rx.test(e.textContent || "")
      );
      const el = matches[matches.length - 1];
      if (!el) return 0;
      let node = el;
      while (node.parentElement && node.parentElement !== container) {
        node = node.parentElement;
      }
      return Math.max(0, node.getBoundingClientRect().top - mr.top - 24);
    }, shot.cropTopText);
  }
  // Fenêtre de capture en px CSS : de `topCss` (0 par défaut) jusqu'au bas réel
  // du contenu. `fullPage` permet de dépasser le viewport ; Playwright applique
  // le deviceScaleFactor lui-même.
  const clip = {
    x: m.x,
    y: m.y + topCss,
    width: m.width,
    height: c.y + c.height - m.y + pad - topCss,
  };
  const full = `public/images/landing/${shot.out}`;
  await page.screenshot({ path: full, fullPage: true, clip });
  console.log(`✓ ${full}`);
}

/*
 * ─── Recadrages « détail » pour la landing mobile ──────────────────────────
 *
 * Une capture d'écran complète réduite à la largeur d'un téléphone tombe à
 * ~0,3× : on distingue des formes, plus un mot. `ProductShot` affiche donc ces
 * recadrages sous 640 px. Largeur ~470 px CSS → ~0,73× une fois affichés sur
 * 342 px, ce qui reste lisible.
 *
 * `anchor` est cherchée comme le plus profond élément contenant ce texte.
 * `block: true` remonte ensuite jusqu'au bloc de section, pour cadrer depuis
 * son bord gauche plutôt que depuis celui du libellé.
 */
const CROPS = [
  // Mobile : on cadre le bloc « Tâches en cours » — titre + deux cartes avec
  // leur badge d'échéance et, sur la seconde, les sous-étapes cochables. À
  // 390 px de large, l'écran entier devient une vignette illisible ; cette zone
  // prouve une chose nette (« ça te dit quoi faire, jusqu'à l'étape »).
  // `viewportW: 700` : sous `md` (768 px) les deux cartes de tâches passent en
  // pile pleine largeur. La sidebar de l'app reste à 256 px à cette largeur,
  // donc le contenu commence à x≈280 et ne fait que ~385 px de large —
  // `w`/`h`/`dx` sont calés sur ce bloc mesuré, pas sur le viewport.
  {
    path: "/dashboard",
    out: "dashboard-mobile.png",
    anchor: "Tâches en cours",
    block: true,
    viewportW: 700,
    w: 392,
    h: 300,
    dx: -4,
  },
  { path: "/live", out: "live-mobile.png", anchor: "itinéraire", w: 470, h: 400, dx: -18, dy: -16, settle: 8000 },
  { path: "/incomes", out: "revenus-mobile.png", anchor: "argent réellement perçu", block: true, w: 470, h: 210 },
  // Première œuvre du catalogue : c'est elle qui a une répartition à trois
  // segments. La seconde est en auto-édition, son donut est un anneau plein.
  { path: "/edition", out: "edition-mobile.png", anchor: "^répartition des droits$", tag: "p", first: true, w: 470, h: 192, dx: -14, dy: -12 },
];

for (const c of CROPS) {
  // Largeur par crop : la plupart cadrent à 1200 px (rendu desktop), le
  // dashboard passe en 700 pour empiler ses cartes de tâches.
  await page.setViewportSize({ width: c.viewportW ?? 1200, height: c.viewportH ?? 1400 });
  await page.goto(`${BASE}${c.path}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_CHROME });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(c.settle ?? 2500);

  const box = await page.evaluate((o) => {
    const main = document.querySelector("main");
    const container = main.firstElementChild;
    const rx = new RegExp(o.anchor, "i");
    const pool = [...main.querySelectorAll(o.tag ?? "*")];
    const hits = pool.filter((e) => rx.test((e.textContent || "").trim()));
    let node = o.first ? hits[0] : hits[hits.length - 1];
    if (!node) return null;
    if (o.block) {
      while (node.parentElement && node.parentElement !== container) {
        node = node.parentElement;
      }
    }
    node.scrollIntoView({ block: "center" });
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y };
  }, c);

  if (!box) {
    console.log(`✗ ${c.out} — ancre « ${c.anchor} » introuvable`);
    continue;
  }
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `public/images/landing/${c.out}`,
    clip: {
      x: Math.max(0, box.x + (c.dx ?? 0)),
      y: Math.max(0, box.y + (c.dy ?? -10)),
      width: c.w,
      height: c.h,
    },
  });
  console.log(`✓ public/images/landing/${c.out}`);
}

await browser.close();

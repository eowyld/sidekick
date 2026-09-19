// Authenticated UI verification with local Live fixtures; no Live writes reach Supabase.
// Requires npm run dev and SHOT_EMAIL / SHOT_PASSWORD (same pattern as shots.mjs).
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import ts from "typescript";
const require = createRequire(import.meta.url);
try { process.loadEnvFile(".env.local"); } catch { /* environment may already be provided */ }
if (!process.env.SHOT_EMAIL || !process.env.SHOT_PASSWORD) throw new Error("SHOT_EMAIL et SHOT_PASSWORD sont nécessaires.");
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(id => imports[id] ?? require(id), module, module.exports);
  return module.exports;
}
const model = load("src/modules/live/lib/live-model.ts");
const { sectorRows } = load("src/lib/demo-seed-data.ts", { "@/modules/live/lib/live-model": model });
const rows = { ...sectorRows("live"), user_live_prospection: [] };
const base = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
mkdirSync("/tmp/sidekick-live-review", { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  let failNextWrite = false;
  await context.route("**/rest/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1);
    if (!(table in rows)) {
      if (request.method() === "GET") return route.continue();
      return route.abort();
    }
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    if (request.method() === "GET") return route.fulfill({ json: rows[table].filter(row => !id || String(row.id) === id) });
    if (failNextWrite) { failNextWrite = false; return route.fulfill({ status: 503, json: { message: "Test save failure" } }); }
    const data = request.postDataJSON();
    if (request.method() === "POST") rows[table].push(...(Array.isArray(data) ? data : [data]));
    if (request.method() === "PATCH") rows[table] = rows[table].map(row => String(row.id) === id ? { ...row, ...data } : row);
    if (request.method() === "DELETE") {
      const raw = url.searchParams.get("id") ?? "";
      const ids = raw.startsWith("in.(") ? raw.slice(4, -1).split(",") : [id];
      rows[table] = rows[table].filter(row => !ids.includes(String(row.id)));
    }
    return route.fulfill({ status: 204, body: "" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/login`);
  await page.fill("#email", process.env.SHOT_EMAIL);
  await page.fill("#password", process.env.SHOT_PASSWORD);
  await Promise.all([page.waitForURL(url => !url.pathname.startsWith("/login"), { timeout: 30000 }), page.click('button[type="submit"]')]);
  for (const [path, name] of [["/live/representations", "dates"], ["/live/spectacles", "spectacles"], ["/live/repetitions", "repetitions"], ["/live/materiel", "materiel"]]) {
    await page.goto(base + path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: `/tmp/sidekick-live-review/${name}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: horizontal overflow`);
  }
  await page.goto(`${base}/live/representations/demo-date-1`);
  await page.getByRole("button", { name: /^Setlist/ }).click();
  await page.getByRole("textbox", { name: "Titre 1", exact: true }).fill("Variante concert");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByText("Date enregistrée", { exact: true }).first().waitFor();
  assert.equal(rows.user_tour_dates[0].details.setlist[0].title, "Variante concert");
  assert.equal(rows.user_live_productions[0].data.setlist[0].title, "Vertige");
  await page.reload();
  await page.getByRole("button", { name: /^Setlist/ }).click();
  assert.equal(await page.getByRole("textbox", { name: "Titre 1", exact: true }).inputValue(), "Variante concert");
  failNextWrite = true;
  await page.getByRole("textbox", { name: "Titre 1", exact: true }).fill("Saisie conservée après erreur");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "L’enregistrement a échoué" }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Titre 1", exact: true }).inputValue(), "Saisie conservée après erreur");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByText("Date enregistrée", { exact: true }).first().waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Feuille de route", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs("/tmp/sidekick-live-review/feuille-de-route.pdf");
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.screenshot({ path: "/tmp/sidekick-live-review/fiche-date-1024.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Event page at 1024px: horizontal overflow");
  assert.deepEqual(errors, []);
  console.log("Live UI checks passed. Screenshots and PDF: /tmp/sidekick-live-review");
} finally { await browser.close(); }

// Run with `node scripts/verify-live-model.cjs`. No database or credentials used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(relative, imports = {}, suffix = "") {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8") + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(name => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected dependency in isolated Live check: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const model = load("src/modules/live/lib/live-model.ts");
const { migrateLiveDetails } = load("src/modules/live/lib/migrate-live-details.ts");
(async () => {
  assert.equal(model.dateISO("03/10/2026"), "2026-10-03");
  assert.equal(model.dateFR("2026-10-03"), "03/10/2026");
  assert.equal(model.money("1 234,50"), 1234.5);
  assert.equal(model.setlistDuration([{ duration: "3:45" }, { duration: "4:30" }]), "8:15");
  assert.equal(model.durationSeconds("oops"), 0);
  const states = Object.fromEntries(model.DATE_STEPS.map(([id]) => [id, "na"]));
  assert.deepEqual(model.progress(model.DATE_STEPS, states), { done: 0, total: 0, percent: 100, next: undefined });
  states.schedule = "done";
  states.transport = "todo";
  assert.equal(model.progress(model.DATE_STEPS, states).percent, 50);
  assert.equal(model.progress(model.DATE_STEPS, states).next, "Transport réservé");
  const show = model.newProduction("dj");
  show.setlist.push({ id: "a", title: "Original", duration: "4:00" });
  const variant = show.setlist.map(item => ({ ...item }));
  variant[0].title = "Version concert";
  assert.equal(show.setlist[0].title, "Original");

  const local = new Map([
    ["live:tour-dates:transports", JSON.stringify({ owned: [{ id: 1, amount: "45", details: "Train" }], stranger: [{ id: 9 }] })],
    ["live:representations-material-by-date", JSON.stringify({ owned: "kit" })],
    ["live:rehearsals-material-by-rehearsal", JSON.stringify({ rehearsal: "kit" })],
  ]);
  global.window = {};
  global.localStorage = { getItem: key => local.get(key) ?? null };
  const writes = [];
  let fail = false;
  const client = { from(table) { return { update(patch) {
    const filters = {};
    const query = { eq(key, value) { filters[key] = value; return query; }, then(resolve) { writes.push({ table, patch, filters }); return Promise.resolve({ error: fail ? { message: "offline" } : null }).then(resolve); } };
    return query;
  } }; } };
  const dates = [{ id: "owned", details: {}, timetable: [] }, { id: "no-legacy", details: {} }];
  const rehearsals = [{ id: "rehearsal", details: {} }];
  await migrateLiveDetails(client, "owner", dates, rehearsals);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].filters.user_id, "owner");
  assert.equal(writes[0].filters.id, "owned");
  assert.equal(dates[0].details.transports[0].amount, "45");
  assert.deepEqual(rehearsals[0].details.equipmentListIds, ["kit"]);
  assert.equal(local.size, 3, "Legacy browser copies must remain intact");
  await migrateLiveDetails(client, "owner", dates, rehearsals);
  assert.equal(writes.length, 2, "Migration must be idempotent");
  const newer = [{ id: "owned", details: { transports: [{ id: 2, amount: "99" }], equipmentListIds: ["new-kit"] } }];
  await migrateLiveDetails(client, "owner", newer, []);
  assert.equal(newer[0].details.transports[0].amount, "99", "Never overwrite newer cloud content");
  fail = true;
  const retry = [{ id: "owned", details: {} }];
  await assert.rejects(migrateLiveDetails(client, "owner", retry, []));
  assert.deepEqual(retry[0].details, {}, "Failed imports must remain retryable");
  fail = false;
  await migrateLiveDetails(client, "owner", retry, []);
  assert.equal(retry[0].details.legacyImported, true);
  // Queue two mutations while the first write fails: rollback must preserve
  // another slice, and the second updater must receive the restored state.
  let cache = { productions: [{ id: "show", count: 0 }], rehearsals: [] };
  let releaseFirst;
  let notifyStarted;
  const firstStarted = new Promise(resolve => { notifyStarted = resolve; });
  const gate = new Promise(resolve => { releaseFirst = resolve; });
  let calls = 0;
  const errors = [];
  const mutationClient = { from() { return { update() {
    const query = { eq() { return query; }, async then(resolve) {
      calls++;
      if (calls === 1) { notifyStarted(); await gate; return resolve({ error: { message: "offline" } }); }
      return resolve({ error: null });
    } };
    return query;
  } }; } };
  const hooks = load("src/hooks/useLiveData.ts", {
    react: { useState() {} },
    swr: { mutate: async (key, updater) => { if (typeof key === "string" && updater) cache = updater(cache); return cache; } },
    "@/lib/supabase": { createClient: () => mutationClient, getSessionUser: async () => ({ data: { user: { id: "owner" } } }) },
    "@/modules/live/lib/live-model": model,
    "@/modules/live/lib/migrate-live-details": { migrateLiveDetails },
  }, "\nexport const testSetter = makeOptimisticSetter;");
  const setter = hooks.testSetter("user_live_productions", item => item, "productions", error => errors.push(error));
  const first = setter(prev => prev.map(item => ({ ...item, count: item.count + 1 })));
  await firstStarted;
  const second = setter(prev => prev.map(item => ({ ...item, count: item.count + 10 })));
  cache = { ...cache, rehearsals: [{ id: "unrelated" }] };
  releaseFirst();
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.equal(cache.productions[0].count, 10);
  assert.deepEqual(cache.rehearsals, [{ id: "unrelated" }]);
  assert.ok(errors.some(Boolean));
  console.log("Live checks passed: dates, setlists, preparation, legacy migration and concurrent save rollback.");
})().catch(error => { console.error(error); process.exitCode = 1; });

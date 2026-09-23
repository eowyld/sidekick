// Tests de fumée HTTP, sans identifiants : ils vérifient ce qui doit rester
// vrai pour un visiteur anonyme (routes protégées, redirection ouverte, cron).
//
//   npm run dev                (ou un `next start`)
//   npm run test:smoke
//
// Cible : SMOKE_BASE_URL, http://localhost:3000 par défaut. Si le serveur ne
// répond pas, les tests sont ignorés plutôt que rouges : la suite ne doit pas
// casser la CI d'un environnement où aucun serveur ne tourne.
import { test, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
let up = false;

before(async () => {
  try {
    await fetch(BASE, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    up = true;
  } catch {
    console.warn(`Aucun serveur sur ${BASE} : tests de fumée ignorés.`);
  }
});

const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });

test("la landing répond", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get("/");
  assert.equal(res.status, 200);
});

test("l'API d'envoi de mail exige une session", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get("/api/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "a@b.co", subject: "s", html: "<p>x</p>", fromEmail: "a@gmail.com" }),
  });
  assert.equal(res.status, 401);
});

test("le cron refuse un appel sans secret", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get("/api/cron/reminders");
  // 401 avec un secret configuré, 500 « not_configured » sans : jamais 200.
  assert.ok([401, 500].includes(res.status), `statut inattendu : ${res.status}`);
});

test("le suivi de clic ne redirige pas vers un schéma dangereux", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get(`/api/mail/track/click?url=${encodeURIComponent("javascript:alert(1)")}`);
  const location = res.headers.get("location") ?? "";
  assert.ok(!location.startsWith("javascript:"), `redirection vers ${location}`);
  assert.equal(new URL(location, BASE).origin, new URL(BASE).origin);
});

test("le suivi de clic accepte une destination https", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get(`/api/mail/track/click?url=${encodeURIComponent("https://example.com/")}`);
  assert.equal(res.headers.get("location"), "https://example.com/");
});

test("une route de l'app sans session ne sert pas de contenu privé", async (t) => {
  if (!up) return t.skip("serveur absent");
  const res = await get("/dashboard");
  const body = res.status === 200 ? await res.text() : "";
  // Soit une redirection vers /login, soit une coquille qui ne contient aucune donnée.
  const redirected = res.status >= 300 && res.status < 400 && (res.headers.get("location") ?? "").includes("/login");
  assert.ok(redirected || !/eliott/i.test(body), "contenu privé servi à un anonyme");
});

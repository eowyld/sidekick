import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOrigin } from "../../src/lib/request-origin.ts";

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

test("serveur lancé sur 0.0.0.0 : l'origine suit l'en-tête Host du navigateur", () => {
  assert.equal(requestOrigin(req("http://0.0.0.0:3000/api/x", { host: "localhost:3000" })), "http://localhost:3000");
});

test("derrière le proxy Vercel : X-Forwarded-Host et X-Forwarded-Proto l'emportent", () => {
  const r = req("http://internal:3000/api/x", { host: "internal:3000", "x-forwarded-host": "sidekickartists.com", "x-forwarded-proto": "https" });
  assert.equal(requestOrigin(r), "https://sidekickartists.com");
});

test("listes d'en-têtes : seule la première valeur compte", () => {
  const r = req("http://x/api", { "x-forwarded-host": "a.com, b.com", "x-forwarded-proto": "https,http" });
  assert.equal(requestOrigin(r), "https://a.com");
});

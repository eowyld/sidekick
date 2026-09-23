import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, tooManyRequests } from "../../src/lib/rate-limit.ts";

test("laisse passer jusqu'à la limite puis refuse", () => {
  const key = `limite:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) {
    assert.equal(rateLimit({ key, limit: 3, windowMs: 60_000 }).allowed, true);
  }
  const refused = rateLimit({ key, limit: 3, windowMs: 60_000 });
  assert.equal(refused.allowed, false);
  assert.ok(refused.retryAfter >= 1, "Retry-After doit valoir au moins 1 seconde");
});

test("deux clés ne partagent pas leur compteur", () => {
  const a = `a:${Math.random()}`;
  const b = `b:${Math.random()}`;
  rateLimit({ key: a, limit: 1, windowMs: 60_000 });
  assert.equal(rateLimit({ key: a, limit: 1, windowMs: 60_000 }).allowed, false);
  assert.equal(rateLimit({ key: b, limit: 1, windowMs: 60_000 }).allowed, true);
});

test("la fenêtre se rouvre une fois écoulée", async () => {
  const key = `fenetre:${Math.random()}`;
  rateLimit({ key, limit: 1, windowMs: 20 });
  assert.equal(rateLimit({ key, limit: 1, windowMs: 20 }).allowed, false);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(rateLimit({ key, limit: 1, windowMs: 20 }).allowed, true);
});

test("la réponse 429 porte l'en-tête Retry-After", async () => {
  const res = tooManyRequests(42);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "42");
  assert.deepEqual(await res.json(), { error: "rate_limited", retryAfter: 42 });
});

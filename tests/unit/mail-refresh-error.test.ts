import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRefreshFailure, isUsableRefreshToken } from "../../src/lib/mail-refresh-error.ts";

test("invalid_grant de Google exige une reconnexion", () => {
  const body = JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." });
  assert.equal(classifyRefreshFailure(body), "reauth_required");
});

test("invalid_grant de Microsoft exige une reconnexion", () => {
  const body = JSON.stringify({ error: "invalid_grant", error_description: "AADSTS70008: The provided authorization code or refresh token has expired." });
  assert.equal(classifyRefreshFailure(body), "reauth_required");
});

test("les autres erreurs restent traitées comme passagères", () => {
  assert.equal(classifyRefreshFailure(JSON.stringify({ error: "invalid_client" })), "transient");
  assert.equal(classifyRefreshFailure(JSON.stringify({ error: "temporarily_unavailable" })), "transient");
  assert.equal(classifyRefreshFailure("<html>502 Bad Gateway</html>"), "transient");
  assert.equal(classifyRefreshFailure(""), "transient");
});

test("un access token Google (ya29.) n'est pas un refresh token utilisable", () => {
  assert.equal(isUsableRefreshToken("ya29.a0AfB_byC-access-token"), false);
});

test("un vrai refresh token Google est utilisable", () => {
  assert.equal(isUsableRefreshToken("1//0gabcdefghijklmnop"), true);
});

test("vide, null ou non-chaîne : non utilisable", () => {
  for (const value of ["", null, undefined, 42, {}]) {
    assert.equal(isUsableRefreshToken(value), false, String(value));
  }
});

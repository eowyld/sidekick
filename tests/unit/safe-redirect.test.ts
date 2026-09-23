import { test } from "node:test";
import assert from "node:assert/strict";
import { safeExternalUrl } from "../../src/lib/safe-redirect.ts";

test("accepte http et https", () => {
  assert.equal(safeExternalUrl("https://example.com/page?a=1"), "https://example.com/page?a=1");
  assert.equal(safeExternalUrl("http://example.com/"), "http://example.com/");
});

test("refuse les schémas exécutables ou locaux", () => {
  for (const candidate of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/x",
  ]) {
    assert.equal(safeExternalUrl(candidate), null, candidate);
  }
});

test("refuse les URL relatives, vides ou malformées", () => {
  for (const candidate of ["/dashboard", "//example.com", "", null, undefined, "pas une url"]) {
    assert.equal(safeExternalUrl(candidate), null, String(candidate));
  }
});

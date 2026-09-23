import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAll } from "../../src/lib/fetch-all.ts";

/** Simule PostgREST : renvoie la tranche demandée, jamais plus de `cap` lignes. */
function fakeTable(total: number, cap = Infinity) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
  };
  return { page, calls };
}

test("lit tout au-delà d'une page", async () => {
  const { page, calls } = fakeTable(2500);
  const { data, error } = await fetchAll(page, 1000);
  assert.equal(error, null);
  assert.equal(data.length, 2500);
  assert.deepEqual(data.map((r) => r.id), Array.from({ length: 2500 }, (_, i) => i));
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("un multiple exact de la page demande une page vide de plus, sans doublon", async () => {
  const { page, calls } = fakeTable(2000);
  const { data } = await fetchAll(page, 1000);
  assert.equal(data.length, 2000);
  assert.equal(calls.length, 3);
});

test("table vide : un seul appel", async () => {
  const { page, calls } = fakeTable(0);
  const { data } = await fetchAll(page, 1000);
  assert.deepEqual(data, []);
  assert.equal(calls.length, 1);
});

test("une page en erreur renvoie l'erreur et aucune ligne", async () => {
  let n = 0;
  const { data, error } = await fetchAll(async () => {
    n += 1;
    return n === 1
      ? { data: Array.from({ length: 10 }, (_, i) => ({ id: i })), error: null }
      : { data: null, error: { message: "boom" } };
  }, 10);
  assert.deepEqual(data, []);
  assert.equal(error?.message, "boom");
});

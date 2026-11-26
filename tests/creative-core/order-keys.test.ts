/**
 * S1 gate — fractional order keys: between / append / prepend / bulk / rebalance keys,
 * determinism, and 10,000 random insertions keeping a strict total order.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_ORDER_KEY_LENGTH,
  REBALANCE_KEY_LENGTH,
  compareOrder,
  evenlySpacedKeys,
  isValidOrderKey,
  keyBetween,
  keysBetween,
  needsRebalance,
} from "@/lib/creative-core";
import { rng } from "./helpers";

function expectAscending(keys: string[]) {
  for (let i = 1; i < keys.length; i++) expect(keys[i - 1] < keys[i], `${keys[i - 1]} < ${keys[i]}`).toBe(true);
}

describe("order keys", () => {
  it("validates the key alphabet and canonical form", () => {
    for (const k of ["V", "1", "zz", "0V", "a0b"]) expect(isValidOrderKey(k)).toBe(true);
    for (const k of ["", "0", "V0", "a-b", "é", " V", "x".repeat(MAX_ORDER_KEY_LENGTH + 1), 5, null]) {
      expect(isValidOrderKey(k)).toBe(false);
    }
  });

  it("produces a key strictly between neighbours", () => {
    const cases: [string | null, string | null][] = [
      [null, null], ["V", null], [null, "V"], ["V", "W"], ["V", "V1"], ["1", "2"], [null, "1"], [null, "01"],
      ["zzz", null], ["01", "1V"], ["V", "VV"], ["Az", "B"], ["y", "z"],
    ];
    for (const [a, b] of cases) {
      const k = keyBetween(a, b);
      expect(isValidOrderKey(k), `${a}..${b} → ${k}`).toBe(true);
      if (a !== null) expect(a < k, `${a} < ${k}`).toBe(true);
      if (b !== null) expect(k < b, `${k} < ${b}`).toBe(true);
    }
  });

  it("rejects invalid or out-of-order neighbours", () => {
    expect(() => keyBetween("W", "V")).toThrow(/out of order/);
    expect(() => keyBetween("V", "V")).toThrow(/out of order/);
    expect(() => keyBetween("V0", null)).toThrow(/Invalid/);
  });

  it("is deterministic", () => {
    const run = () => {
      const r = rng(7);
      const keys: string[] = [];
      for (let i = 0; i < 500; i++) {
        const at = r.int(keys.length + 1);
        keys.splice(at, 0, keyBetween(keys[at - 1] ?? null, keys[at] ?? null));
      }
      return keys;
    };
    expect(run()).toEqual(run());
  });

  it("keeps appended keys short (≈ one character per 30 appends)", () => {
    let k: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 1000; i++) keys.push((k = keyBetween(k, null)));
    expectAscending(keys);
    expect(k!.length).toBeLessThanOrEqual(40);
    expect(keys[29].length).toBe(1);
  });

  it("keeps prepended keys ordered", () => {
    let k: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 500; i++) keys.unshift((k = keyBetween(null, k)));
    expectAscending(keys);
  });

  it("stays strictly ordered and valid through 10,000 random insertions", () => {
    const r = rng(42);
    const keys: string[] = [];
    let maxLength = 0;
    for (let i = 0; i < 10_000; i++) {
      const at = r.int(keys.length + 1);
      const k = keyBetween(keys[at - 1] ?? null, keys[at] ?? null);
      keys.splice(at, 0, k);
      maxLength = Math.max(maxLength, k.length);
    }
    expectAscending(keys);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(isValidOrderKey)).toBe(true);
    // Random positions grow keys logarithmically, far below the hard limit.
    expect(maxLength).toBeLessThan(MAX_ORDER_KEY_LENGTH / 2);
  });

  it("repeated insertion at one spot grows keys and triggers rebalance", () => {
    let lo: string = keyBetween(null, null);
    const hi = keyBetween(lo, null);
    const keys = [lo, hi];
    while (!needsRebalance(keys)) {
      lo = keyBetween(lo, hi);
      keys.push(lo);
    }
    expect(keys.some((k) => k.length > REBALANCE_KEY_LENGTH)).toBe(true);
  });

  it("generates n ordered keys between neighbours with logarithmic length", () => {
    for (const [a, b] of [[null, null], ["V", "W"], [null, "1"], ["z", null]] as const) {
      const keys = keysBetween(a, b, 200);
      expect(keys).toHaveLength(200);
      expectAscending([...(a ? [a] : []), ...keys, ...(b ? [b] : [])]);
    }
    expect(Math.max(...keysBetween("V", "W", 1000).map((k) => k.length))).toBeLessThanOrEqual(4);
  });

  it("spaces rebalance keys evenly, short, ordered, and SQL-reproducible", () => {
    for (const n of [1, 2, 3, 10, 61, 62, 240, 1000, 5000]) {
      const keys = evenlySpacedKeys(n);
      expect(keys).toHaveLength(n);
      expectAscending(keys);
      expect(keys.every(isValidOrderKey)).toBe(true);
      expect(needsRebalance(keys)).toBe(false);
      // Room remains between every pair.
      for (let i = 1; i < keys.length; i++) expect(isValidOrderKey(keyBetween(keys[i - 1], keys[i]))).toBe(true);
    }
    expect(evenlySpacedKeys(3)).toEqual(["FV", "V", "kV"]); // floor(i·62²/4) in base 62
    expect(evenlySpacedKeys(0)).toEqual([]);
  });

  it("orders siblings by (orderKey, id)", () => {
    const list = [
      { orderKey: "V", id: "b" },
      { orderKey: "F", id: "z" },
      { orderKey: "V", id: "a" },
    ].sort(compareOrder);
    expect(list.map((x) => `${x.orderKey}${x.id}`)).toEqual(["Fz", "Va", "Vb"]);
  });
});

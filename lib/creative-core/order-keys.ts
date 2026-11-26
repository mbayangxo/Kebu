/**
 * Fractional order keys — base-62, variable length, deterministic (3C DESIGN FREEZE §7).
 *
 * A key is the digit string of a fraction in (0, 1): "V" = 0.V₆₂. Digits are ASCII-ordered
 * (0-9 < A-Z < a-z), so plain string comparison — and PostgreSQL `collate "C"` — orders keys
 * numerically. Keys never end in "0", so every fraction has exactly one spelling and two
 * distinct keys always have room between them.
 *
 * Siblings are ordered by (orderKey, id); ids only break ties in malformed data, never by design.
 */

export const ORDER_KEY_DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = ORDER_KEY_DIGITS.length;
const ZERO = ORDER_KEY_DIGITS[0];
const MAX_DIGIT = ORDER_KEY_DIGITS[BASE - 1];

/** A parent is rebalanced when any child key grows beyond this length. */
export const REBALANCE_KEY_LENGTH = 24;

/** Keys longer than this are rejected as malformed input (well above REBALANCE_KEY_LENGTH). */
export const MAX_ORDER_KEY_LENGTH = 128;

const KEY_RE = /^[0-9A-Za-z]*[1-9A-Za-z]$/;

export function isValidOrderKey(key: unknown): key is string {
  return typeof key === "string" && key.length <= MAX_ORDER_KEY_LENGTH && KEY_RE.test(key);
}

/** Total order for siblings: orderKey, then id. Both compare by code unit (= collate "C"). */
export function compareOrder(a: { orderKey: string; id: string }, b: { orderKey: string; id: string }): number {
  if (a.orderKey !== b.orderKey) return a.orderKey < b.orderKey ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function digitValue(ch: string): number {
  const v = ORDER_KEY_DIGITS.indexOf(ch);
  if (v < 0) throw new Error(`Invalid order key digit "${ch}"`);
  return v;
}

/**
 * Shortest-ish key strictly between fractions `a` and `b` (digits only, no validation).
 * `a` = "" means 0; `b` = null means 1. Requires a < b.
 */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    // Shared prefix (a is padded with implicit zeros).
    let n = 0;
    while ((a[n] ?? ZERO) === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const da = a ? digitValue(a[0]) : 0;
  const db = b !== null ? digitValue(b[0]) : BASE;
  if (db - da > 1) return ORDER_KEY_DIGITS[Math.round((da + db) / 2)];
  // Consecutive first digits.
  if (b !== null && b.length > 1) return b[0];
  return ORDER_KEY_DIGITS[da] + midpoint(a.slice(1), null);
}

/** Smallest-step key after `a`: increment the first digit that can be incremented. */
function after(a: string): string {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== MAX_DIGIT) return a.slice(0, i) + ORDER_KEY_DIGITS[digitValue(a[i]) + 1];
  }
  return a + ORDER_KEY_DIGITS[BASE >> 1];
}

/** Key before `b`: decrement the first digit when that stays non-zero, else take a midpoint. */
function before(b: string): string {
  const d = digitValue(b[0]);
  if (d > 1) return ORDER_KEY_DIGITS[d - 1];
  return midpoint("", b);
}

/**
 * A key strictly between `a` and `b` (either may be null for "no neighbour").
 *   keyBetween(null, null) → first key
 *   keyBetween(last, null) → append (grows ~1 char per 30 appends)
 *   keyBetween(null, first) → prepend
 * Deterministic: the same inputs always give the same key.
 */
export function keyBetween(a: string | null, b: string | null): string {
  if (a !== null && !isValidOrderKey(a)) throw new Error(`Invalid order key "${a}"`);
  if (b !== null && !isValidOrderKey(b)) throw new Error(`Invalid order key "${b}"`);
  if (a !== null && b !== null && a >= b) throw new Error(`Order keys out of order: "${a}" >= "${b}"`);
  if (a === null && b === null) return ORDER_KEY_DIGITS[BASE >> 1];
  if (b === null) return after(a!);
  if (a === null) return before(b);
  return midpoint(a, b);
}

/** `n` keys strictly between `a` and `b`, ascending (used for multi-node paste). */
export function keysBetween(a: string | null, b: string | null, n: number): string[] {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid key count ${n}`);
  if (n === 0) return [];
  if (n === 1) return [keyBetween(a, b)];
  if (b === null) {
    const out: string[] = [];
    let prev = a;
    for (let i = 0; i < n; i++) out.push((prev = keyBetween(prev, null)));
    return out;
  }
  if (a === null) {
    const out: string[] = [];
    let next = b;
    for (let i = 0; i < n; i++) out.push((next = keyBetween(null, next)));
    return out.reverse();
  }
  // Bisect so key length grows with log(n), not n.
  const mid = Math.floor(n / 2);
  const m = keyBetween(a, b);
  return [...keysBetween(a, m, mid), m, ...keysBetween(m, b, n - mid - 1)];
}

/**
 * `n` evenly spaced keys in (0, 1), all of the same short length — the rebalance / backfill
 * layout. Deterministic and reproducible in SQL: key i (1-based) is
 * floor(i · 62^L / (n + 1)) written as L base-62 digits with trailing zeros removed, where L is
 * the smallest length giving at least 16 key slots per gap.
 */
export function evenlySpacedKeys(n: number): string[] {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid key count ${n}`);
  if (n === 0) return [];
  let length = 1;
  let space = BASE;
  while (space < 16 * (n + 1)) {
    length++;
    space *= BASE;
  }
  if (!Number.isSafeInteger(space)) throw new Error(`Too many keys to space evenly: ${n}`);
  const keys: string[] = [];
  for (let i = 1; i <= n; i++) {
    let value = Math.floor((i * space) / (n + 1));
    let digits = "";
    for (let d = 0; d < length; d++) {
      digits = ORDER_KEY_DIGITS[value % BASE] + digits;
      value = Math.floor(value / BASE);
    }
    keys.push(digits.replace(/0+$/, ""));
  }
  return keys;
}

/** Whether a sibling set's keys need rebalancing. */
export function needsRebalance(keys: Iterable<string>): boolean {
  for (const k of keys) if (k.length > REBALANCE_KEY_LENGTH) return true;
  return false;
}

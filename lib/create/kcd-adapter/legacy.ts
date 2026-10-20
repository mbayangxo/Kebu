/**
 * Adapter-owned metadata that makes 3B → KCD → 3B lossless.
 *
 * The model holds 3B content in its own fields. Stored data it cannot hold exactly (a non-scalar
 * theme entry, a malformed device layout, `deviceOverrides: {}`, a website-v1 section's foreign
 * keys, a non-dense sort_order) is kept verbatim as a *shadow* of the original, in the
 * preserved `unknown` bags:
 *
 *   document  meta.legacy       { origin, theme?, extra? }
 *   page      unknown.legacy    { layouts?, sortOrder?, extra? }
 *   node      unknown.legacy    { id?, anonymous?, chrome?, source?, sortOrder? }
 *
 * Write-back rule (every shadow): if lifting the shadow again gives exactly the model's current
 * content, the shadow is written back verbatim; otherwise the model's content is written in the
 * canonical 3B shape. So an unchanged document round-trips byte-for-byte, an edited value is
 * written from the model, and a shadow can never resurrect stale content.
 */
import {
  canonicalStringify,
  isNodeId,
  type DeviceComposition,
  type KcdDocument,
  type KcdNode,
  type KcdPage,
  type NodeId,
  type TokenSet,
} from "@/lib/creative-core";
import { AdapterError } from "./errors";
import { isPlainObject } from "./stored-props";

/** A preserved original value; `raw` is absent when the original was absent. */
export type Shadow = { raw?: unknown };

export type LegacyOrigin = "3b-rows" | "website-v1";

export interface LegacyDocumentData {
  origin: LegacyOrigin;
  /** Rows carried the 3C S4 storage columns (versions are written back). */
  storage?: boolean;
  theme?: Shadow;
  /** website-v1 top-level keys outside the schema. */
  extra?: Record<string, unknown>;
}

export interface LegacyPageData {
  layouts?: Shadow;
  sortOrder?: number;
  /** website-v1 page keys outside the schema. */
  extra?: Record<string, unknown>;
}

export interface LegacyNodeData {
  /** website-v1 section id when it is not the node id. */
  id?: string;
  /** website-v1 section had no id. */
  anonymous?: true;
  /** Node is the site-chrome header/footer projected onto its page (never a stored row). */
  chrome?: "header" | "footer";
  /** Original stored form: rows → props object; website-v1 → the section without its id. */
  source?: Shadow & { form: "rows" | "v1" };
  sortOrder?: number;
}

export const sameJson = (a: unknown, b: unknown) => canonicalStringify(a) === canonicalStringify(b);

/** Deep JSON copy of untrusted input in its own key order (drops undefined members; rejects non-JSON values). */
export function toJson<T>(value: T, what: string): T {
  try {
    canonicalStringify(value);
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (e) {
    throw new AdapterError("invalid-input", `${what} is not JSON: ${(e as Error).message}`);
  }
}

export function shadowOf(container: Record<string, unknown>, key: string): Shadow {
  return key in container && container[key] !== undefined ? { raw: container[key] } : {};
}

export function shadowValue(shadow: Shadow): { present: boolean; value: unknown } {
  return "raw" in shadow ? { present: true, value: shadow.raw } : { present: false, value: undefined };
}

// ── Accessors ─────────────────────────────────────────────────────────────────

export function legacyOfDocument(doc: KcdDocument): LegacyDocumentData | undefined {
  const v = doc.meta.legacy;
  return isPlainObject(v) ? (v as unknown as LegacyDocumentData) : undefined;
}

export function legacyOfPage(page: KcdPage): LegacyPageData {
  const v = page.unknown?.legacy;
  return isPlainObject(v) ? (v as LegacyPageData) : {};
}

export function legacyOfNode(node: KcdNode): LegacyNodeData {
  const v = node.unknown?.legacy;
  return isPlainObject(v) ? (v as LegacyNodeData) : {};
}

/** `{ legacy: data }` with empty members removed, or undefined when nothing remains. */
export function legacyBag(data: object): { legacy: Record<string, unknown> } | undefined {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  return entries.length ? { legacy: Object.fromEntries(entries) } : undefined;
}

// ── Theme ⇄ tokens ────────────────────────────────────────────────────────────

const isScalar = (v: unknown) => typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));

/** Scalar entries of a stored theme. */
export function tokensFromTheme(theme: unknown): TokenSet {
  if (!isPlainObject(theme)) return {};
  return Object.fromEntries(Object.entries(theme).filter(([, v]) => isScalar(v))) as TokenSet;
}

/** Tokens + the theme shadow needed when tokens cannot reproduce the stored theme exactly. */
export function liftTheme(container: Record<string, unknown>, key: string): { tokens: TokenSet; shadow?: Shadow } {
  const shadow = shadowOf(container, key);
  const tokens = tokensFromTheme(shadow.raw);
  const exact = "raw" in shadow && isPlainObject(shadow.raw) && sameJson(tokens, shadow.raw);
  return exact ? { tokens } : { tokens, shadow };
}

/** The stored theme for a document (absent only when it was absent and tokens are unchanged). */
export function writeTheme(doc: KcdDocument): { present: boolean; value: unknown } {
  const shadow = legacyOfDocument(doc)?.theme;
  if (!shadow) return { present: true, value: { ...doc.tokens } };
  if (sameJson(tokensFromTheme(shadow.raw), doc.tokens)) return shadowValue(shadow);
  const kept = isPlainObject(shadow.raw) ? Object.fromEntries(Object.entries(shadow.raw).filter(([, v]) => !isScalar(v))) : {};
  return { present: true, value: { ...kept, ...doc.tokens } };
}

// ── Device layouts ⇄ page.deviceLayout ────────────────────────────────────────

const LAYOUT_DEVICES = ["tablet", "mobile"] as const;
const MAX_IDS = 40;

/**
 * 3B-tolerant reading of stored device layouts (device-composition.ts `listedIds`): non-string,
 * empty and duplicate ids are ignored. `forward` maps legacy ids (chrome ids, website-v1 ids) to
 * node ids; an id that maps to nothing a composition can hold (padded, or longer than 80
 * characters) names no section and is ignored; an id both ordered and hidden is hidden (its order
 * has no effect). None of this changes what 3B renders, and the original is kept as a shadow
 * when the result is not exact.
 */
export function liftLayouts(raw: unknown, forward: (id: string) => string, roots: ReadonlySet<string>): KcdPage["deviceLayout"] {
  const out: KcdPage["deviceLayout"] = {};
  if (!isPlainObject(raw)) return out;
  for (const device of LAYOUT_DEVICES) {
    const comp = raw[device];
    if (!isPlainObject(comp)) continue;
    const list = (value: unknown): string[] | undefined => {
      if (!Array.isArray(value)) return undefined;
      const seen = new Set<string>();
      for (const id of value) {
        if (typeof id !== "string" || !id) continue;
        const mapped = forward(id);
        if (mapped.trim() === mapped && mapped.length <= 80) seen.add(mapped);
      }
      return [...seen];
    };
    const hidden = list(comp.hiddenSections);
    let order = list(comp.sectionOrder);
    if (order && hidden) order = order.filter((id) => !hidden.includes(id));
    const composition: DeviceComposition = {};
    if (order) composition.order = cap(order, roots, device, "order") as NodeId[];
    if (hidden) composition.hidden = cap(hidden, roots, device, "hidden") as NodeId[];
    out[device] = composition;
  }
  return out;
}

function cap(ids: string[], roots: ReadonlySet<string>, device: string, list: string): string[] {
  if (ids.length <= MAX_IDS) return ids;
  // Ids of sections that no longer exist have no effect in 3B; drop them before giving up.
  const live = ids.filter((id) => roots.has(id));
  if (live.length <= MAX_IDS) return live;
  throw new AdapterError("unrepresentable-layout", `The ${device} ${list} list names ${live.length} sections (at most ${MAX_IDS})`);
}

/** page.deviceLayout → the 3B stored shape (`null` for rows / absent for website-v1 when empty). */
export function repackLayouts(layout: KcdPage["deviceLayout"], backward: (id: string) => string, style: "rows" | "v1"): unknown {
  const out: Record<string, unknown> = {};
  for (const device of LAYOUT_DEVICES) {
    const comp = layout[device];
    if (!comp) continue;
    const stored: Record<string, unknown> = {};
    if (comp.order) stored.sectionOrder = comp.order.map(backward);
    if (comp.hidden) stored.hiddenSections = comp.hidden.map(backward);
    out[device] = stored;
  }
  if (Object.keys(out).length) return out;
  return style === "rows" ? null : undefined;
}

export function writeLayouts(
  page: KcdPage,
  forward: (id: string) => string,
  backward: (id: string) => string,
  roots: ReadonlySet<string>,
  style: "rows" | "v1",
): { present: boolean; value: unknown } {
  const shadow = legacyOfPage(page).layouts;
  if (shadow) {
    let relifted: KcdPage["deviceLayout"] | null = null;
    try {
      relifted = liftLayouts(shadow.raw, forward, roots);
    } catch {
      relifted = null;
    }
    if (relifted && sameJson(relifted, page.deviceLayout)) return shadowValue(shadow);
  }
  const value = repackLayouts(page.deviceLayout, backward, style);
  return { present: value !== undefined, value };
}

// ── sort_order ────────────────────────────────────────────────────────────────

/** Whether stored sort orders are exactly 0..n-1 in list order (then no shadow is needed). */
export function isDense(sortOrders: readonly number[]): boolean {
  return sortOrders.every((s, i) => s === i);
}

/**
 * Sort orders to write for items in their current order: the preserved originals while every
 * item still has one and they are still non-decreasing; otherwise dense 0..n-1.
 */
export function writeSortOrders(preserved: readonly (number | undefined)[]): number[] {
  const all = preserved.every((s): s is number => typeof s === "number");
  if (all && preserved.every((s, i) => i === 0 || (preserved[i - 1] as number) <= (s as number))) return preserved as number[];
  return preserved.map((_, i) => i);
}

/** Stable order by sort_order (ties keep input order, as 3B's `Array.prototype.sort` does). */
export function bySortOrder<T extends { sort_order: number }>(items: readonly T[]): T[] {
  return items.map((item, i) => ({ item, i })).sort((a, b) => a.item.sort_order - b.item.sort_order || a.i - b.i).map((x) => x.item);
}

export function assertNodeId(id: unknown, what: string): asserts id is string {
  if (!isNodeId(id)) throw new AdapterError("invalid-id", `${what} id ${JSON.stringify(id)} is not a UUID`);
}

/**
 * Shared fixtures for the Creative Core suites: seeded randomness, deterministic ids, document
 * builders, and the production legacy-section registry (wired to the real 3B save boundary).
 */
import {
  KCD_SCHEMA_VERSION,
  PILOT_DEFINITIONS,
  createRegistry,
  keyBetween,
  type KcdDocument,
  type KcdNode,
  type KcdPage,
  type NodeId,
  type PageId,
} from "@/lib/creative-core";
import { LEGACY_DEFINITIONS, builderRegistry, legacyDefinition, repackStoredProps, sectionFieldsOf } from "@/lib/create/kcd-adapter";
import { containsUnsafeSiteContent } from "@/lib/create/site-seo";

/** mulberry32 — small, fast, seedable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;

/** Deterministic UUID v4 from a counter (stable across runs). */
export function uuidFor(n: number, ns = 0): string {
  const hex = (n >>> 0).toString(16).padStart(12, "0");
  const nsHex = (ns >>> 0).toString(16).padStart(8, "0");
  return `${nsHex}-0000-4000-8000-${hex}`;
}

export function idSource(ns = 1) {
  let n = 0;
  return () => uuidFor(++n, ns) as NodeId;
}

export const PAGE_A = uuidFor(1, 0xfa6e) as PageId;
export const PAGE_B = uuidFor(2, 0xfa6e) as PageId;

export function emptyDocument(pages: PageId[] = [PAGE_A]): KcdDocument {
  let key: string | null = null;
  const list: KcdPage[] = pages.map((id, i) => {
    key = keyBetween(key, null);
    return { id, slug: i === 0 ? "home" : `page-${i}`, title: i === 0 ? "Home" : `Page ${i}`, orderKey: key, deviceLayout: {}, layoutVersion: 1 };
  });
  return {
    schemaVersion: KCD_SCHEMA_VERSION,
    id: "11111111-1111-4111-8111-111111111111",
    kind: "site",
    title: "Fixture",
    tokens: { primary: "#0F0D33", fontDisplay: "Fraunces" },
    meta: {},
    pages: list,
    nodes: {},
  };
}

export function node(partial: Partial<KcdNode> & Pick<KcdNode, "id" | "type" | "pageId" | "orderKey">): KcdNode {
  return { typeVersion: 1, parentId: null, props: {}, overrides: {}, version: 1, ...partial };
}

// ── Legacy sections (production registry: lib/create/kcd-adapter) ─────────────

/** The 3B stored props shape of a legacy node (reserved keys re-packed). */
export function toStoredProps(n: KcdNode): Record<string, unknown> {
  return repackStoredProps(sectionFieldsOf(n));
}

export { legacyDefinition, LEGACY_DEFINITIONS };
export const registry = builderRegistry;
export const pilotRegistry = createRegistry(PILOT_DEFINITIONS);
export const applyOptions = { isUnsafeContent: containsUnsafeSiteContent };

/** Strip versions so content can be compared across apply/inverse. */
export function content(doc: KcdDocument) {
  const nodes: Record<string, Omit<KcdNode, "version">> = {};
  for (const [id, n] of Object.entries(doc.nodes)) {
    const { version: _v, ...rest } = n;
    void _v;
    nodes[id] = rest;
  }
  return { ...doc, pages: doc.pages.map(({ layoutVersion: _l, ...p }) => (void _l, p)), nodes };
}

// ── Performance ───────────────────────────────────────────────────────────────

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Median time per call in microseconds. */
export function measure(fn: () => void): number {
  let iterations = 1;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    if (performance.now() - t0 >= 4 || iterations >= 1 << 16) break;
    iterations *= 2;
  }
  const samples: number[] = [];
  for (let s = 0; s < 7; s++) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    samples.push(((performance.now() - t0) * 1000) / iterations);
  }
  return median(samples);
}

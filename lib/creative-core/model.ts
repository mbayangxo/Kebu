/**
 * Kebu Creative Document (KCD) — canonical document / node model.
 *
 * Renderer-agnostic and storage-agnostic: this module knows nothing about React, Next.js,
 * Supabase, the DOM or `lib/create`. The Builder reaches it through adapters
 * (`lib/create/kcd-adapter`) and renderers negotiate with it through `RendererManifest`.
 *
 * Design authority: docs/product/3C-DESIGN-FREEZE.md §2.
 */

export const KCD_SCHEMA_VERSION = "kcd-1" as const;
export type KcdSchemaVersion = typeof KCD_SCHEMA_VERSION;

/** Opaque, permanent identity (UUID). Never encodes position, parent, device or order. */
export type NodeId = string & { readonly __brand: "NodeId" };
export type PageId = string & { readonly __brand: "PageId" };

/**
 * Node type id: a pilot primitive (`section`, `group`, `text`, `image`) or a namespaced
 * compatibility type such as `legacy-section:hero`.
 */
export type NodeTypeId = string;

/** Desktop is the base; only these two device slots can override (D4). */
export type OverrideDevice = "tablet" | "mobile";
export type Device = "desktop" | OverrideDevice;

export const DEVICES: readonly Device[] = ["desktop", "tablet", "mobile"];
export const OVERRIDE_DEVICES: readonly OverrideDevice[] = ["tablet", "mobile"];

/** Theme → tokens (colors, fonts, spacing, radius, motion flags). Values are JSON scalars. */
export type TokenSet = Record<string, string | number | boolean>;

/** SEO, provenance, template origin — opaque to the core, preserved verbatim. */
export type DocumentMeta = Record<string, unknown>;

export interface KcdDocument {
  schemaVersion: KcdSchemaVersion;
  /** Project id (site) or design id (Studio, later). */
  id: string;
  /** Renderer-agnostic; "design" is reserved for Studio. */
  kind: "site" | "design";
  title: string;
  tokens: TokenSet;
  meta: DocumentMeta;
  /** Ordered by orderKey (tie-break: id). */
  pages: KcdPage[];
  /** Normalized flat map; the tree is parentId + orderKey. */
  nodes: Record<NodeId, KcdNode>;
  /** Preserved document-level data from newer/foreign versions. */
  unknown?: Record<string, unknown>;
}

export interface KcdPage {
  id: PageId;
  slug: string;
  title: string;
  orderKey: string;
  /** Page-scoped per-device composition of ROOT nodes (3B project_pages.device_layouts semantics). */
  deviceLayout: { tablet?: DeviceComposition; mobile?: DeviceComposition };
  /** Optimistic concurrency for deviceLayout. */
  layoutVersion: number;
  /** Preserved page-level data from newer/foreign versions. */
  unknown?: Record<string, unknown>;
}

export interface DeviceComposition {
  order?: NodeId[];
  hidden?: NodeId[];
}

export type ResponsiveMode = "auto" | "custom" | "needs-review";

export interface KcdNode {
  id: NodeId;
  type: NodeTypeId;
  /** Per-type schema version. */
  typeVersion: number;
  pageId: PageId;
  /** null = page root. */
  parentId: NodeId | null;
  /** Fractional key among siblings (order-keys.ts). */
  orderKey: string;
  /** BASE (desktop) values, validated by the type definition. */
  props: Record<string, unknown>;
  /** Sparse, per-key device overrides (responsive.ts). */
  overrides: Partial<Record<OverrideDevice, Record<string, unknown>>>;
  /** 3B deviceOverrides._state, preserved. */
  responsiveState?: { mode: ResponsiveMode; baseHash?: string };
  /** 3B _visibility, preserved. */
  visibility?: NodeVisibility;
  /** Semantics live in the model. */
  a11y?: NodeA11y;
  /** Opaque payload; capability "motion" governs use (3E defines it). */
  motion?: unknown;
  /** Opaque, capability-gated (3E). */
  interaction?: unknown;
  /** Opaque, capability-gated (later product integration). */
  dataBinding?: unknown;
  /** Stored now; enforced by the editor in 3D. */
  locked?: boolean;
  /** Unrecognized node data preserved verbatim. */
  unknown?: Record<string, unknown>;
  /** node_version — the server is the authority (ops.ts). */
  version: number;
}

export interface NodeVisibility {
  hideOn?: Device[];
  showOn?: Device[];
}

export interface NodeA11y {
  /** Primitive semantics. */
  role?: "region" | "banner" | "contentinfo" | "navigation" | "heading" | "img" | "presentation" | "none";
  label?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Media alternative text. */
  alt?: string;
  /** Media: alt intentionally empty. */
  decorative?: boolean;
  lang?: string;
  /**
   * 3B section a11y (`_a11y`) fields — carried so legacy sections lift into the model
   * losslessly. Same meaning and constraints as `sectionA11ySchema` in 3B.
   */
  landmark?: "main" | "nav" | "banner" | "complementary" | "contentinfo" | "region";
  skipTarget?: boolean;
  liveRegion?: "polite" | "assertive";
}

// ── Identity ──────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Any RFC 4122 UUID in canonical lowercase form (stored identities). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** UUID v4 — required for every id a client creates. */
export function isUuidV4(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_RE.test(value);
}

export function isNodeId(value: unknown): value is NodeId {
  return isUuid(value);
}

export function isPageId(value: unknown): value is PageId {
  return isUuid(value);
}

/** Fresh UUID v4 node id (Web Crypto — available in browsers and Node ≥ 19). */
export function newNodeId(): NodeId {
  return globalThis.crypto.randomUUID() as NodeId;
}

export function newPageId(): PageId {
  return globalThis.crypto.randomUUID() as PageId;
}

// ── Node type ids ─────────────────────────────────────────────────────────────

export const LEGACY_SECTION_PREFIX = "legacy-section:";

const NODE_TYPE_RE = /^[a-z][a-z0-9-]{0,63}(:[a-z0-9][a-z0-9-]{0,63})?$/;

export function isNodeTypeId(value: unknown): value is NodeTypeId {
  return typeof value === "string" && NODE_TYPE_RE.test(value);
}

export function legacySectionType(sectionType: string): NodeTypeId {
  return `${LEGACY_SECTION_PREFIX}${sectionType}`;
}

/** The 3B section type of a `legacy-section:*` node type, or null. */
export function legacySectionTypeOf(type: NodeTypeId): string | null {
  return type.startsWith(LEGACY_SECTION_PREFIX) ? type.slice(LEGACY_SECTION_PREFIX.length) : null;
}

// ── Reserved property keys ────────────────────────────────────────────────────

/**
 * Storage-level keys that 3B keeps inside `project_sections.props`. In the model they are
 * lifted into dedicated node fields, so they never appear in `KcdNode.props` and cannot be
 * written with setProp.
 */
export const RESERVED_PROP_KEYS: ReadonlySet<string> = new Set([
  "deviceOverrides",
  "_motion",
  "_a11y",
  "_visibility",
  "_interaction",
  "_dataBinding",
  // `locked` (3C S4 storage decision: same reserved-key convention as the 3B extensions).
  "_locked",
]);

/** Path segments that would reach object prototypes. */
export const FORBIDDEN_PATH_SEGMENTS: ReadonlySet<string> = new Set(["__proto__", "prototype", "constructor"]);

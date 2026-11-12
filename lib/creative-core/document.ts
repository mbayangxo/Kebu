/**
 * Document parsing, structural validation and canonical serialization.
 *
 *   parseDocument(json)      — untrusted input → KcdDocument, or a list of issues. Rejects
 *                              malformed and stale/foreign schema versions; preserves unknown
 *                              document/page/node fields in `unknown` bags.
 *   serializeDocument(doc)   — canonical JSON (sorted keys, no undefined). Unknown bags are
 *                              written back where they came from, so round trips are lossless.
 *   checkStructure(doc)      — tree invariants (pages, parents, acyclicity, sibling order keys).
 */
import type { DeviceComposition, KcdDocument, KcdNode, KcdPage, NodeId, OverrideDevice, PageId } from "./model";
import { FORBIDDEN_PATH_SEGMENTS, KCD_SCHEMA_VERSION, OVERRIDE_DEVICES, RESERVED_PROP_KEYS, isNodeId, isNodeTypeId, isPageId } from "./model";
import { compareOrder, isValidOrderKey } from "./order-keys";
import { deviceCompositionSchema, nodeA11ySchema, nodeVisibilitySchema, responsiveStateSchema } from "./schemas";

export interface DocumentIssue {
  code: "unsupported-schema" | "malformed" | "structure";
  path: string;
  message: string;
}

export type ParseResult = { ok: true; document: KcdDocument } | { ok: false; issues: DocumentIssue[] };

// ── Canonical JSON ────────────────────────────────────────────────────────────

/**
 * Deterministic JSON: object keys sorted by code unit, `undefined` members omitted, `null` kept.
 * Two structurally equal values always serialize identically (content hashes, equality checks).
 * Non-JSON values (functions, symbols, bigint, non-finite numbers) are rejected.
 */
export function canonicalStringify(value: unknown): string {
  const out: string[] = [];
  writeCanonical(value, out, "$");
  return out.join("");
}

function writeCanonical(value: unknown, out: string[], path: string): void {
  if (value === null) {
    out.push("null");
    return;
  }
  switch (typeof value) {
    case "string":
    case "boolean":
      out.push(JSON.stringify(value));
      return;
    case "number":
      if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path}`);
      out.push(JSON.stringify(value));
      return;
    case "object":
      break;
    default:
      throw new Error(`Value of type ${typeof value} is not JSON at ${path}`);
  }
  if (Array.isArray(value)) {
    out.push("[");
    for (let i = 0; i < value.length; i++) {
      if (i) out.push(",");
      if (value[i] === undefined) out.push("null");
      else writeCanonical(value[i], out, `${path}[${i}]`);
    }
    out.push("]");
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`Non-plain object at ${path}`);
  const keys = Object.keys(value as object)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort();
  out.push("{");
  keys.forEach((k, i) => {
    if (i) out.push(",");
    out.push(JSON.stringify(k), ":");
    writeCanonical((value as Record<string, unknown>)[k], out, `${path}.${k}`);
  });
  out.push("}");
}

// ── Serialization ─────────────────────────────────────────────────────────────

const DOCUMENT_FIELDS = ["schemaVersion", "id", "kind", "title", "tokens", "meta", "pages", "nodes"] as const;
const PAGE_FIELDS = ["id", "slug", "title", "orderKey", "deviceLayout", "layoutVersion"] as const;
const NODE_FIELDS = [
  "id", "type", "typeVersion", "pageId", "parentId", "orderKey", "props", "overrides", "responsiveState",
  "visibility", "a11y", "motion", "interaction", "dataBinding", "locked", "version",
] as const;

function withUnknown(known: Record<string, unknown>, unknown: Record<string, unknown> | undefined, fields: readonly string[], where: string) {
  if (!unknown) return known;
  for (const k of Object.keys(unknown)) {
    if (fields.includes(k)) throw new Error(`${where}: preserved field "${k}" collides with a model field`);
  }
  return { ...unknown, ...known };
}

/** Plain JSON value of the document (unknown bags spread back to their original position). */
export function documentToJson(doc: KcdDocument): Record<string, unknown> {
  const { unknown, ...rest } = doc;
  const nodes: Record<string, unknown> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    const { unknown: nodeUnknown, ...known } = node;
    nodes[id] = withUnknown(known, nodeUnknown, NODE_FIELDS, `node ${id}`);
  }
  const pages = doc.pages.map((page) => {
    const { unknown: pageUnknown, ...known } = page;
    return withUnknown(known, pageUnknown, PAGE_FIELDS, `page ${page.id}`);
  });
  return withUnknown({ ...rest, pages, nodes }, unknown, DOCUMENT_FIELDS, "document");
}

/** Canonical serialized form. `parseDocument(serializeDocument(d))` reproduces `d`. */
export function serializeDocument(doc: KcdDocument): string {
  return canonicalStringify(documentToJson(doc));
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 1;
}

function split(input: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> | undefined {
  const extra = Object.keys(input).filter((k) => !fields.includes(k));
  if (!extra.length) return undefined;
  return Object.fromEntries(extra.map((k) => [k, input[k]]));
}

/** Reject values that cannot survive a JSON round trip unchanged. */
function checkJsonValue(value: unknown, path: string, issues: DocumentIssue[]): void {
  try {
    canonicalStringify(value);
  } catch (e) {
    issues.push({ code: "malformed", path, message: (e as Error).message });
  }
}

function checkPropKeys(props: Record<string, unknown>, path: string, issues: DocumentIssue[]): void {
  for (const k of Object.keys(props)) {
    if (RESERVED_PROP_KEYS.has(k)) issues.push({ code: "malformed", path: `${path}.${k}`, message: `Reserved storage key "${k}" inside props` });
    if (FORBIDDEN_PATH_SEGMENTS.has(k)) issues.push({ code: "malformed", path: `${path}.${k}`, message: `Forbidden key "${k}"` });
  }
}

function parsePage(raw: unknown, path: string, issues: DocumentIssue[]): KcdPage | null {
  if (!isPlainObject(raw)) {
    issues.push({ code: "malformed", path, message: "Page must be an object" });
    return null;
  }
  const bad = (field: string, message: string) => issues.push({ code: "malformed", path: `${path}.${field}`, message });
  const before = issues.length;
  if (!isPageId(raw.id)) bad("id", "Page id must be a UUID");
  if (typeof raw.slug !== "string" || !raw.slug) bad("slug", "Slug must be a non-empty string");
  if (typeof raw.title !== "string") bad("title", "Title must be a string");
  if (!isValidOrderKey(raw.orderKey)) bad("orderKey", "Invalid order key");
  if (!isPositiveInt(raw.layoutVersion)) bad("layoutVersion", "layoutVersion must be an integer ≥ 1");
  const deviceLayout: KcdPage["deviceLayout"] = {};
  if (!isPlainObject(raw.deviceLayout)) bad("deviceLayout", "deviceLayout must be an object");
  else {
    for (const k of Object.keys(raw.deviceLayout)) {
      if (!OVERRIDE_DEVICES.includes(k as OverrideDevice)) bad(`deviceLayout.${k}`, `Unknown device "${k}"`);
    }
    for (const device of OVERRIDE_DEVICES) {
      const comp = raw.deviceLayout[device];
      if (comp === undefined) continue;
      const parsed = deviceCompositionSchema.safeParse(comp);
      if (!parsed.success) bad(`deviceLayout.${device}`, parsed.error.issues.map((i) => i.message).join("; "));
      else deviceLayout[device] = parsed.data as DeviceComposition;
    }
  }
  if (issues.length > before) return null;
  const unknown = split(raw, PAGE_FIELDS);
  if (unknown) checkJsonValue(unknown, `${path}(unknown)`, issues);
  return {
    id: raw.id as PageId,
    slug: raw.slug as string,
    title: raw.title as string,
    orderKey: raw.orderKey as string,
    deviceLayout,
    layoutVersion: raw.layoutVersion as number,
    ...(unknown ? { unknown } : {}),
  };
}

function parseNode(key: string, raw: unknown, path: string, issues: DocumentIssue[]): KcdNode | null {
  if (!isPlainObject(raw)) {
    issues.push({ code: "malformed", path, message: "Node must be an object" });
    return null;
  }
  const bad = (field: string, message: string) => issues.push({ code: "malformed", path: `${path}.${field}`, message });
  const before = issues.length;
  if (!isNodeId(raw.id)) bad("id", "Node id must be a UUID");
  else if (raw.id !== key) bad("id", `Node id "${raw.id}" does not match its key "${key}"`);
  if (!isNodeTypeId(raw.type)) bad("type", "Invalid node type id");
  if (!isPositiveInt(raw.typeVersion)) bad("typeVersion", "typeVersion must be an integer ≥ 1");
  if (!isPageId(raw.pageId)) bad("pageId", "pageId must be a UUID");
  if (raw.parentId !== null && !isNodeId(raw.parentId)) bad("parentId", "parentId must be a UUID or null");
  if (!isValidOrderKey(raw.orderKey)) bad("orderKey", "Invalid order key");
  if (!isPositiveInt(raw.version)) bad("version", "version must be an integer ≥ 1");
  if (!isPlainObject(raw.props)) bad("props", "props must be an object");
  else checkPropKeys(raw.props, `${path}.props`, issues);
  const overrides: KcdNode["overrides"] = {};
  if (!isPlainObject(raw.overrides)) bad("overrides", "overrides must be an object");
  else {
    for (const k of Object.keys(raw.overrides)) {
      const bucket = raw.overrides[k];
      if (!OVERRIDE_DEVICES.includes(k as OverrideDevice)) bad(`overrides.${k}`, `Unknown device "${k}"`);
      else if (!isPlainObject(bucket)) bad(`overrides.${k}`, "Override bucket must be an object");
      else {
        checkPropKeys(bucket, `${path}.overrides.${k}`, issues);
        overrides[k as OverrideDevice] = bucket;
      }
    }
  }
  const optional = <T>(field: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }) => {
    if (raw[field] === undefined) return undefined;
    const r = schema.safeParse(raw[field]);
    if (!r.success) {
      bad(field, r.error!.issues.map((i) => i.message).join("; "));
      return undefined;
    }
    return r.data;
  };
  const responsiveState = optional<KcdNode["responsiveState"]>("responsiveState", responsiveStateSchema);
  const visibility = optional<KcdNode["visibility"]>("visibility", nodeVisibilitySchema);
  const a11y = optional<KcdNode["a11y"]>("a11y", nodeA11ySchema);
  if (raw.locked !== undefined && typeof raw.locked !== "boolean") bad("locked", "locked must be a boolean");
  if (issues.length > before) return null;
  checkJsonValue(raw.props, `${path}.props`, issues);
  checkJsonValue(raw.overrides, `${path}.overrides`, issues);
  for (const f of ["motion", "interaction", "dataBinding"] as const) {
    if (raw[f] !== undefined) checkJsonValue(raw[f], `${path}.${f}`, issues);
  }
  const unknown = split(raw, NODE_FIELDS);
  if (unknown) checkJsonValue(unknown, `${path}(unknown)`, issues);
  if (issues.length > before) return null;
  const node: KcdNode = {
    id: raw.id as NodeId,
    type: raw.type as string,
    typeVersion: raw.typeVersion as number,
    pageId: raw.pageId as PageId,
    parentId: raw.parentId as NodeId | null,
    orderKey: raw.orderKey as string,
    props: raw.props as Record<string, unknown>,
    overrides,
    version: raw.version as number,
  };
  if (responsiveState !== undefined) node.responsiveState = responsiveState;
  if (visibility !== undefined) node.visibility = visibility;
  if (a11y !== undefined) node.a11y = a11y;
  if (raw.motion !== undefined) node.motion = raw.motion;
  if (raw.interaction !== undefined) node.interaction = raw.interaction;
  if (raw.dataBinding !== undefined) node.dataBinding = raw.dataBinding;
  if (raw.locked !== undefined) node.locked = raw.locked as boolean;
  if (unknown) node.unknown = unknown;
  return node;
}

/**
 * Parse an untrusted document (JSON text or value). The result shares no mutable structure
 * with the input and keeps its key order.
 */
export function parseDocument(input: unknown): ParseResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return { ok: false, issues: [{ code: "malformed", path: "$", message: "Not valid JSON" }] };
    }
  } else {
    try {
      // Validate JSON-ness canonically, but copy in the input's own key order: key order is not
      // semantic, yet renderers serialize values (e.g. motion specs into attributes), so the
      // in-memory document keeps it. Only serialization is canonical.
      canonicalStringify(input);
      raw = JSON.parse(JSON.stringify(input));
    } catch (e) {
      return { ok: false, issues: [{ code: "malformed", path: "$", message: (e as Error).message }] };
    }
  }
  if (!isPlainObject(raw)) return { ok: false, issues: [{ code: "malformed", path: "$", message: "Document must be an object" }] };
  if (raw.schemaVersion !== KCD_SCHEMA_VERSION) {
    const found = typeof raw.schemaVersion === "string" ? `"${raw.schemaVersion}"` : "none";
    const hint = raw.schemaVersion === "website-v1" ? " — convert website-v1 through the legacy adapter" : "";
    return {
      ok: false,
      issues: [{ code: "unsupported-schema", path: "$.schemaVersion", message: `Unsupported document schema ${found}; expected "${KCD_SCHEMA_VERSION}"${hint}` }],
    };
  }
  const issues: DocumentIssue[] = [];
  const bad = (field: string, message: string) => issues.push({ code: "malformed", path: `$.${field}`, message });
  if (typeof raw.id !== "string" || !raw.id) bad("id", "Document id must be a non-empty string");
  if (raw.kind !== "site" && raw.kind !== "design") bad("kind", 'kind must be "site" or "design"');
  if (typeof raw.title !== "string") bad("title", "Title must be a string");
  if (!isPlainObject(raw.tokens)) bad("tokens", "tokens must be an object");
  else {
    for (const [k, v] of Object.entries(raw.tokens)) {
      if (!["string", "number", "boolean"].includes(typeof v)) bad(`tokens.${k}`, "Token values must be strings, numbers or booleans");
    }
  }
  if (!isPlainObject(raw.meta)) bad("meta", "meta must be an object");
  if (!Array.isArray(raw.pages)) bad("pages", "pages must be an array");
  if (!isPlainObject(raw.nodes)) bad("nodes", "nodes must be an object");
  if (issues.length) return { ok: false, issues };

  const pages: KcdPage[] = [];
  (raw.pages as unknown[]).forEach((p, i) => {
    const page = parsePage(p, `$.pages[${i}]`, issues);
    if (page) pages.push(page);
  });
  const nodes: Record<NodeId, KcdNode> = {};
  for (const [key, value] of Object.entries(raw.nodes as Record<string, unknown>)) {
    const node = parseNode(key, value, `$.nodes["${key}"]`, issues);
    if (node) nodes[node.id] = node;
  }
  if (issues.length) return { ok: false, issues };
  pages.sort(compareOrder);

  const unknown = split(raw, DOCUMENT_FIELDS);
  const document: KcdDocument = {
    schemaVersion: KCD_SCHEMA_VERSION,
    id: raw.id as string,
    kind: raw.kind as KcdDocument["kind"],
    title: raw.title as string,
    tokens: raw.tokens as KcdDocument["tokens"],
    meta: raw.meta as KcdDocument["meta"],
    pages,
    nodes,
    ...(unknown ? { unknown } : {}),
  };
  const structure = checkStructure(document);
  if (structure.length) return { ok: false, issues: structure };
  return { ok: true, document };
}

// ── Structure ─────────────────────────────────────────────────────────────────

/**
 * Tree invariants: unique page ids/slugs/order keys, every node on an existing page, parents
 * exist on the same page, no cycles, (parent, orderKey) unique among siblings. Type rules
 * (which parent may hold which child) need the registry — see `validateDocument` in validate.ts.
 */
export function checkStructure(doc: KcdDocument): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ code: "structure", path, message });
  const pageIds = new Set<string>();
  const slugs = new Set<string>();
  const pageKeys = new Set<string>();
  doc.pages.forEach((p, i) => {
    if (pageIds.has(p.id)) issue(`$.pages[${i}].id`, `Duplicate page id ${p.id}`);
    if (slugs.has(p.slug)) issue(`$.pages[${i}].slug`, `Duplicate page slug "${p.slug}"`);
    if (pageKeys.has(p.orderKey)) issue(`$.pages[${i}].orderKey`, `Duplicate page order key "${p.orderKey}"`);
    pageIds.add(p.id);
    slugs.add(p.slug);
    pageKeys.add(p.orderKey);
  });
  const siblingKeys = new Set<string>();
  for (const node of Object.values(doc.nodes)) {
    const path = `$.nodes["${node.id}"]`;
    if (!pageIds.has(node.pageId)) issue(`${path}.pageId`, `Unknown page ${node.pageId}`);
    if (node.parentId !== null) {
      const parent = doc.nodes[node.parentId];
      if (!parent) issue(`${path}.parentId`, `Missing parent ${node.parentId}`);
      else if (parent.pageId !== node.pageId) issue(`${path}.parentId`, "Parent is on a different page");
    }
    const siblingKey = `${node.pageId}|${node.parentId ?? ""}|${node.orderKey}`;
    if (siblingKeys.has(siblingKey)) issue(`${path}.orderKey`, `Duplicate order key "${node.orderKey}" among siblings`);
    siblingKeys.add(siblingKey);
  }
  // Cycles: walk each node's ancestor chain once (memoized), so the check is linear.
  const state = new Map<string, 1 | 2>(); // 1 = on current path, 2 = known acyclic
  for (const start of Object.keys(doc.nodes)) {
    const path: string[] = [];
    let id: string | null = start;
    while (id !== null && !state.has(id)) {
      state.set(id, 1);
      path.push(id);
      id = doc.nodes[id as NodeId]?.parentId ?? null;
    }
    if (id !== null && state.get(id) === 1) issue(`$.nodes["${id}"].parentId`, "Parent cycle");
    for (const p of path) state.set(p, 2);
  }
  return issues;
}

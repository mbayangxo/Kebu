/**
 * Operation vocabulary, transaction application and inversion (3C DESIGN FREEZE §4, §6, §7, §8).
 *
 * `applyTransaction` is the pure reference implementation of the server authority
 * (`apply_node_ops`, S4): same invariants, same version rules, same rebalance. The client uses
 * it for optimistic application and to compute inverses from the confirmed pre-state.
 *
 * Semantics:
 *   • Atomic: every op is validated and applied in order against the running state; any failure
 *     rejects the whole transaction and the input document is untouched.
 *   • Versions: every EXISTING node/page an op addresses must appear in `expect` with its
 *     current version (else KCD_CONFLICT / KCD_INVALID). Each touched node/page version rises
 *     by exactly 1 per transaction; inserted nodes start at 1; restored nodes at recorded + 1.
 *   • Sibling order keys are unique per parent; checked when the transaction completes, so a
 *     transaction may move keys through transient collisions.
 *   • Rebalance: any parent whose children were inserted/moved/restored and now has a key
 *     longer than REBALANCE_KEY_LENGTH gets evenly spaced keys (order and identity unchanged);
 *     those children's versions rise by 1 and the inverse restores their previous keys.
 *   • Inverse: `inverse` undoes the transaction when applied to the resulting document
 *     (content-identical, versions aside).
 */
import type {
  DeviceComposition,
  KcdDocument,
  KcdNode,
  KcdPage,
  NodeA11y,
  NodeId,
  NodeVisibility,
  OverrideDevice,
  PageId,
} from "./model";
import { FORBIDDEN_PATH_SEGMENTS, OVERRIDE_DEVICES, RESERVED_PROP_KEYS, isNodeId, isUuid, isUuidV4 } from "./model";
import { canonicalStringify } from "./document";
import { migrateNode } from "./migrate";
import { compareOrder, evenlySpacedKeys, isValidOrderKey, needsRebalance } from "./order-keys";
import type { NodeTypeDefinition, Registry } from "./registry";
import { overridableKeys } from "./registry";
import { deviceCompositionSchema, nodeA11ySchema, nodeVisibilitySchema, responsiveStateSchema } from "./schemas";

/** A node as created by the client (insertNode): identity + content; placement comes from the op. */
export type NewNode = Omit<KcdNode, "version" | "pageId" | "parentId" | "orderKey">;
/** A node with its placement (insertSubtree: duplicate/paste with new ids). */
export type NewPlacedNode = Omit<KcdNode, "version">;

export type NewPage = Omit<KcdPage, "layoutVersion">;

export type Op =
  | { op: "insertPage"; page: NewPage }
  | { op: "updatePage"; pageId: PageId; title?: string; slug?: string }
  | { op: "movePage"; pageId: PageId; orderKey: string }
  | { op: "removePage"; pageId: PageId }
  | { op: "restorePage"; page: KcdPage; nodes: KcdNode[] }
  | { op: "insertNode"; node: NewNode; parentId: NodeId | null; pageId: PageId; orderKey: string }
  | { op: "insertSubtree"; nodes: NewPlacedNode[] }
  | { op: "removeNode"; id: NodeId }
  | { op: "restoreSubtree"; nodes: KcdNode[] }
  | { op: "moveNode"; id: NodeId; parentId: NodeId | null; orderKey: string }
  | { op: "setProp"; id: NodeId; path: string; value: unknown }
  | { op: "unsetProp"; id: NodeId; path: string }
  | { op: "setOverride"; id: NodeId; device: OverrideDevice; key: string; value: unknown }
  | { op: "clearOverride"; id: NodeId; device: OverrideDevice; key?: string }
  | { op: "setDeviceComposition"; pageId: PageId; device: OverrideDevice; composition: DeviceComposition | null }
  | { op: "setA11y" | "setVisibility" | "setLocked" | "setResponsiveState" | "setMotion" | "setInteraction"; id: NodeId; value: unknown };

export type OpName = Op["op"];

export interface Transaction {
  /** Client UUID; idempotency key. */
  txId: string;
  origin: "user" | "ai" | "system" | "migration";
  /** History label. */
  label: string;
  /** Applied atomically, in order. */
  ops: Op[];
  /** Node id / page id → expected version. */
  expect: Record<string, number>;
}

/** Payload limits — identical to the database function's. */
export const TX_LIMITS = {
  maxOps: 500,
  maxNodeBytes: 256 * 1024,
  maxTxBytes: 2 * 1024 * 1024,
  maxLabelLength: 120,
  maxPathDepth: 8,
} as const;

export type TxError =
  | { code: "KCD_CONFLICT"; message: string; conflicts: { id: string; expected: number | null; actual: number }[] }
  | { code: "KCD_INVALID"; message: string; opIndex?: number }
  | { code: "KCD_LIMIT"; message: string; opIndex?: number };

export type ApplyResult =
  | {
      ok: true;
      document: KcdDocument;
      /** Ops that undo this transaction on `document`. */
      inverse: Op[];
      /** New version of every node/page written (inserted, updated, restored, rebalanced). */
      versions: Record<string, number>;
      /** Ids removed (whole subtrees). */
      removed: NodeId[];
      removedPages?: PageId[];
      /** Parents whose children were rebalanced. */
      rebalanced: (NodeId | PageId)[];
    }
  | { ok: false; error: TxError };

export interface ApplyOptions {
  /**
   * Unsafe-content guard applied to every written value (the Builder passes 3B
   * `containsUnsafeSiteContent`; the core does not own the block list).
   */
  isUnsafeContent?: (serialized: string) => boolean;
}

class TxFailure extends Error {
  constructor(readonly error: TxError) {
    super(error.message);
  }
}

function invalid(message: string, opIndex?: number): never {
  throw new TxFailure({ code: "KCD_INVALID", message, opIndex });
}
function limit(message: string, opIndex?: number): never {
  throw new TxFailure({ code: "KCD_LIMIT", message, opIndex });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Deep copy of a JSON value (also rejects non-JSON values). */
function jsonCopy<T>(value: T, what: string, opIndex: number): T {
  let text: string;
  try {
    text = canonicalStringify(value);
  } catch (e) {
    return invalid(`${what}: ${(e as Error).message}`, opIndex);
  }
  return JSON.parse(text) as T;
}

// ── Expectations ──────────────────────────────────────────────────────────────

/** Existing node/page ids `ops` address (the ids a transaction must carry in `expect`). */
export function addressedIds(doc: KcdDocument, ops: readonly Op[]): string[] {
  const ids = new Set<string>();
  const pageIds = new Set(doc.pages.map((p) => p.id));
  for (const op of ops) {
    if (op.op === "insertNode" || op.op === "insertSubtree" || op.op === "restoreSubtree" || op.op === "insertPage" || op.op === "restorePage") continue;
    if (op.op === "setDeviceComposition" || op.op === "updatePage" || op.op === "movePage" || op.op === "removePage") {
      if (pageIds.has(op.pageId)) ids.add(op.pageId);
      if (op.op === "removePage") for (const node of Object.values(doc.nodes)) if (node.pageId === op.pageId) ids.add(node.id);
    } else if (doc.nodes[op.id]) ids.add(op.id);
  }
  return [...ids].sort();
}

/** The `expect` map for `ops` against the confirmed document. */
export function expectFor(doc: KcdDocument, ops: readonly Op[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of addressedIds(doc, ops)) {
    const node = doc.nodes[id as NodeId];
    out[id] = node ? node.version : doc.pages.find((p) => p.id === id)!.layoutVersion;
  }
  return out;
}

// ── Working state ─────────────────────────────────────────────────────────────

const slotKey = (pageId: string, parentId: string | null) => `${pageId}|${parentId ?? ""}`;

class Working {
  readonly nodes: Record<NodeId, KcdNode>;
  pages: KcdPage[];
  private index: Map<string, Set<NodeId>> | null = null;
  /** Nodes whose content/placement changed (existing at start → version bump). */
  readonly touchedNodes = new Set<NodeId>();
  readonly touchedPages = new Set<PageId>();
  readonly insertedPages = new Set<PageId>();
  readonly restoredPages = new Map<PageId, number>();
  readonly removedPages = new Set<PageId>();
  readonly inserted = new Set<NodeId>();
  readonly restored = new Map<NodeId, number>();
  readonly removed = new Set<NodeId>();
  /** Parents (slot keys) whose child set/order changed. */
  readonly structuralSlots = new Set<string>();

  constructor(readonly doc: KcdDocument, readonly registry: Registry, readonly options: ApplyOptions) {
    this.nodes = { ...doc.nodes };
    this.pages = doc.pages;
  }

  private slots(): Map<string, Set<NodeId>> {
    if (!this.index) {
      this.index = new Map();
      for (const node of Object.values(this.nodes)) this.addToSlot(node);
    }
    return this.index;
  }

  private addToSlot(node: KcdNode) {
    const key = slotKey(node.pageId, node.parentId);
    const set = this.index!.get(key);
    if (set) set.add(node.id);
    else this.index!.set(key, new Set([node.id]));
  }

  childIds(pageId: string, parentId: string | null): NodeId[] {
    return [...(this.slots().get(slotKey(pageId, parentId)) ?? [])];
  }

  page(pageId: string): KcdPage | undefined {
    return this.pages.find((p) => p.id === pageId);
  }

  node(id: NodeId, opIndex: number): KcdNode {
    const node = this.nodes[id];
    if (!node) invalid(`Element ${id} does not exist`, opIndex);
    return node;
  }

  put(node: KcdNode) {
    const prev = this.nodes[node.id];
    if (this.index) {
      if (prev) this.slots().get(slotKey(prev.pageId, prev.parentId))?.delete(prev.id);
      this.addToSlot(node);
    }
    this.nodes[node.id] = node;
    if (!prev || prev.pageId !== node.pageId || prev.parentId !== node.parentId || prev.orderKey !== node.orderKey) {
      this.structuralSlots.add(slotKey(node.pageId, node.parentId));
    }
  }

  delete(id: NodeId) {
    const prev = this.nodes[id];
    if (!prev) return;
    if (this.index) this.slots().get(slotKey(prev.pageId, prev.parentId))?.delete(id);
    delete this.nodes[id];
  }

  /** `id` and its descendants, parents first, siblings in order. */
  subtree(id: NodeId): KcdNode[] {
    const out: KcdNode[] = [];
    const stack = [this.nodes[id]];
    while (stack.length) {
      const node = stack.pop()!;
      out.push(node);
      const kids = this.childIds(node.pageId, node.id).map((k) => this.nodes[k]).sort(compareOrder);
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
    return out;
  }

  isAncestorOrSelf(candidate: NodeId, of: NodeId | null): boolean {
    let id: NodeId | null = of;
    const seen = new Set<NodeId>();
    while (id !== null && !seen.has(id)) {
      if (id === candidate) return true;
      seen.add(id);
      id = this.nodes[id]?.parentId ?? null;
    }
    return false;
  }

  markNode(id: NodeId) {
    if (this.doc.nodes[id] && !this.inserted.has(id) && !this.restored.has(id)) this.touchedNodes.add(id);
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

function definitionFor(w: Working, node: Pick<KcdNode, "type" | "id">, opIndex: number): NodeTypeDefinition {
  const def = w.registry.get(node.type);
  if (!def) invalid(`Element ${node.id} has unsupported type "${node.type}" and can only be removed`, opIndex);
  return def!;
}

/** Bring a node to its type's current version before writing (persisted on this write). */
function current(w: Working, node: KcdNode, opIndex: number): KcdNode {
  definitionFor(w, node, opIndex);
  const result = migrateNode(node, w.registry);
  if (result.status === "unsupported") invalid(result.message, opIndex);
  return result.node;
}

function guard(w: Working, value: unknown, what: string, opIndex: number) {
  if (w.options.isUnsafeContent && value !== undefined && w.options.isUnsafeContent(canonicalStringify(value))) {
    invalid(`${what}: content blocked for security (scripts or unsafe embeds are not allowed)`, opIndex);
  }
}

/** Validate a node's content against its type; returns the node with normalized props/overrides. */
function validateContent(w: Working, node: KcdNode, def: NodeTypeDefinition, opIndex: number): KcdNode {
  const size = canonicalStringify(node.props).length + canonicalStringify(node.overrides).length;
  if (size > TX_LIMITS.maxNodeBytes) limit(`Element ${node.id} is too large (${size} bytes)`, opIndex);
  if (node.motion !== undefined && !def.capabilities.has("motion")) invalid(`"${def.displayName}" does not support motion`, opIndex);
  if (node.interaction !== undefined && !def.capabilities.has("interaction")) invalid(`"${def.displayName}" does not support interactions`, opIndex);
  if (node.dataBinding !== undefined && !def.capabilities.has("dataBinding")) invalid(`"${def.displayName}" does not support data connections`, opIndex);
  if (node.a11y !== undefined && !def.capabilities.has("a11y")) invalid(`"${def.displayName}" does not support accessibility settings`, opIndex);
  const hasOverrides = OVERRIDE_DEVICES.some((d) => node.overrides[d] && Object.keys(node.overrides[d]!).length);
  if ((node.visibility !== undefined || hasOverrides) && !def.capabilities.has("responsive.overrides")) {
    invalid(`"${def.displayName}" does not support per-device settings`, opIndex);
  }

  if (def.writePolicy === "legacy-3b-boundary") {
    const r = def.validateWrite!(node);
    if (!r.ok) invalid(`${def.displayName}: ${r.error}`, opIndex);
    return node;
  }

  const parsed = def.propsSchema.safeParse(node.props);
  if (!parsed.success) invalid(`${def.displayName}: ${issueText(parsed.error)}`, opIndex);
  const props = parsed.data as Record<string, unknown>;
  const allowed = overridableKeys(def);
  const overrides: KcdNode["overrides"] = {};
  for (const device of OVERRIDE_DEVICES) {
    const bucket = node.overrides[device];
    if (!bucket || !Object.keys(bucket).length) continue;
    for (const key of Object.keys(bucket)) {
      if (!allowed.has(key)) invalid(`${def.displayName}: "${key}" cannot be set per device`, opIndex);
    }
    const merged = def.propsSchema.safeParse({ ...props, ...bucket });
    if (!merged.success) invalid(`${def.displayName} (${device}): ${issueText(merged.error)}`, opIndex);
    const data = merged.data as Record<string, unknown>;
    overrides[device] = Object.fromEntries(Object.keys(bucket).map((k) => [k, data[k]]));
  }
  const normalized = { ...node, props, overrides };
  if (def.validateWrite) { const valid = def.validateWrite(normalized); if (!valid.ok) invalid(valid.error, opIndex); }
  return normalized;
}

function issueText(error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.map(String).join(".")}: ${i.message}` : i.message)).join("; ");
}

function checkPlacement(w: Working, child: { id: NodeId; type: string; pageId: PageId }, parentId: NodeId | null, def: NodeTypeDefinition, opIndex: number) {
  if (!w.page(child.pageId)) invalid(`Page ${child.pageId} does not exist`, opIndex);
  if (parentId === null) {
    if (def.placement === "nested") invalid(`"${def.displayName}" must be placed inside another element`, opIndex);
    return;
  }
  const parent = w.nodes[parentId];
  if (!parent) invalid(`Parent ${parentId} does not exist`, opIndex);
  if (parent.pageId !== child.pageId) invalid("An element and its parent must be on the same page", opIndex);
  if (def.placement === "root") invalid(`"${def.displayName}" can only be placed at the top level of a page`, opIndex);
  const parentDef = definitionFor(w, parent, opIndex);
  if (parentDef.children === "none" || !parentDef.children.allow.includes(child.type)) {
    invalid(`"${parentDef.displayName}" cannot contain "${def.displayName}"`, opIndex);
  }
}

function checkNewId(w: Working, id: unknown, opIndex: number): asserts id is NodeId {
  if (!isUuidV4(id)) invalid(`New element ids must be UUID v4 (got ${String(id)})`, opIndex);
  if (w.nodes[id as NodeId] || w.removed.has(id as NodeId)) invalid(`Element id ${String(id)} is already in use`, opIndex);
}

function parsePath(path: unknown, opIndex: number): string[] {
  if (typeof path !== "string" || !path) return invalid("Property path is required", opIndex);
  const segments = path.split(".");
  if (segments.length > TX_LIMITS.maxPathDepth) limit(`Property path "${path}" is too deep`, opIndex);
  for (const s of segments) {
    if (!s) invalid(`Invalid property path "${path}"`, opIndex);
    if (FORBIDDEN_PATH_SEGMENTS.has(s)) invalid(`Forbidden property path "${path}"`, opIndex);
  }
  if (RESERVED_PROP_KEYS.has(segments[0])) invalid(`"${segments[0]}" is managed by a dedicated operation`, opIndex);
  return segments;
}

/** Value at path, and the length of the path prefix that exists. */
function readPath(obj: Record<string, unknown>, segments: string[]): { value: unknown; existing: number } {
  let cur: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    if (!isPlainObject(cur) || !Object.prototype.hasOwnProperty.call(cur, segments[i])) return { value: undefined, existing: i };
    cur = cur[segments[i]];
  }
  return { value: cur, existing: segments.length };
}

function writePath(obj: Record<string, unknown>, segments: string[], value: unknown, opIndex: number): Record<string, unknown> {
  const [head, ...rest] = segments;
  if (!rest.length) {
    const out = { ...obj };
    if (value === undefined) delete out[head];
    else out[head] = value;
    return out;
  }
  const child = obj[head];
  if (child !== undefined && !isPlainObject(child)) invalid(`Cannot set "${segments.join(".")}" inside a non-object value`, opIndex);
  if (child === undefined && value === undefined) return obj;
  return { ...obj, [head]: writePath((child as Record<string, unknown>) ?? {}, rest, value, opIndex) };
}

// ── Operation application ─────────────────────────────────────────────────────

type Step = (w: Working, op: Op, opIndex: number) => Op[];

function insertOne(w: Working, raw: NewPlacedNode, opIndex: number): void {
  if (!isPlainObject(raw)) invalid("Element must be an object", opIndex);
  checkNewId(w, raw.id, opIndex);
  const def = w.registry.get(raw.type);
  if (!def) invalid(`Unknown element type "${String(raw.type)}"`, opIndex);
  if (raw.typeVersion !== def!.version) invalid(`"${def!.displayName}" must be created at version ${def!.version}`, opIndex);
  if (raw.parentId !== null && !isNodeId(raw.parentId)) invalid("parentId must be a UUID or null", opIndex);
  if (!isValidOrderKey(raw.orderKey)) invalid(`Invalid order key "${String(raw.orderKey)}"`, opIndex);
  if (!isPlainObject(raw.props)) invalid("props must be an object", opIndex);
  if (!isPlainObject(raw.overrides)) invalid("overrides must be an object", opIndex);
  for (const k of Object.keys(raw.overrides)) if (!OVERRIDE_DEVICES.includes(k as OverrideDevice)) invalid(`Unknown device "${k}"`, opIndex);
  for (const k of Object.keys(raw.props)) if (RESERVED_PROP_KEYS.has(k) || FORBIDDEN_PATH_SEGMENTS.has(k)) invalid(`Invalid prop key "${k}"`, opIndex);
  checkPlacement(w, raw, raw.parentId, def!, opIndex);
  const copy = jsonCopy(raw, "Element", opIndex);
  const node: KcdNode = { ...copy, version: 1 };
  if (node.visibility !== undefined) node.visibility = parseOrFail(nodeVisibilitySchema, node.visibility, "Visibility", opIndex);
  if (node.a11y !== undefined) node.a11y = parseOrFail(nodeA11ySchema, node.a11y, "Accessibility", opIndex);
  if (node.responsiveState !== undefined) node.responsiveState = parseOrFail(responsiveStateSchema, node.responsiveState, "Responsive state", opIndex);
  if (node.locked !== undefined && typeof node.locked !== "boolean") invalid("locked must be a boolean", opIndex);
  guard(w, { props: node.props, overrides: node.overrides, a11y: node.a11y }, def!.displayName, opIndex);
  w.put(validateContent(w, node, def!, opIndex));
  w.inserted.add(node.id);
}

function parseOrFail<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> } } }, value: unknown, what: string, opIndex: number): T {
  const r = schema.safeParse(value);
  if (!r.success) return invalid(`${what}: ${issueText(r.error)}`, opIndex);
  return r.data;
}

function pageContent(w: Working, raw: NewPage | KcdPage, i: number): NewPage {
  if (!isPlainObject(raw) || !isUuid(raw.id) || !isValidOrderKey(raw.orderKey)) invalid("Page needs a UUID and valid order key", i);
  if (typeof raw.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug) || raw.slug.length > 60) invalid("Invalid page slug", i);
  if (typeof raw.title !== "string" || !raw.title.trim() || raw.title.length > 120) invalid("Page title must be 1–120 characters", i);
  if (!isPlainObject(raw.deviceLayout) || Object.keys(raw.deviceLayout).some((key) => !OVERRIDE_DEVICES.includes(key as OverrideDevice))) invalid("Invalid page device layouts", i);
  for (const device of OVERRIDE_DEVICES) if (raw.deviceLayout[device] !== undefined && !deviceCompositionSchema.safeParse(raw.deviceLayout[device]).success) invalid("Invalid page device composition", i);
  guard(w, raw, "Page", i);
  return jsonCopy(raw, "Page", i);
}

const STEPS: Record<OpName, Step> = {
  insertPage(w, op, i) {
    const o = op as Extract<Op, { op: "insertPage" }>;
    const page = pageContent(w, o.page, i);
    if (!isUuidV4(page.id) || w.page(page.id) || w.nodes[page.id as unknown as NodeId] || w.removedPages.has(page.id)) invalid("New page id is already used or is not UUID v4", i);
    if (w.pages.length >= 20) invalid("Maximum 20 pages per site", i);
    w.pages = [...w.pages, { ...page, layoutVersion: 1 }]; w.insertedPages.add(page.id);
    return [{ op: "removePage", pageId: page.id }];
  },
  updatePage(w, op, i) {
    const o = op as Extract<Op, { op: "updatePage" }>;
    const page = w.page(o.pageId); if (!page) invalid("Page does not exist", i);
    const next = { ...page, ...(o.title === undefined ? {} : { title: o.title }), ...(o.slug === undefined ? {} : { slug: o.slug }) };
    pageContent(w, next, i);
    if (page.title === next.title && page.slug === next.slug) return [];
    w.pages = w.pages.map((p) => p.id === page.id ? next : p); w.touchedPages.add(page.id);
    return [{ op: "updatePage", pageId: page.id, title: page.title, slug: page.slug }];
  },
  movePage(w, op, i) {
    const o = op as Extract<Op, { op: "movePage" }>;
    const page = w.page(o.pageId); if (!page || !isValidOrderKey(o.orderKey)) invalid("Page or position is invalid", i);
    if (page.orderKey === o.orderKey) return [];
    w.pages = w.pages.map((p) => p.id === page.id ? { ...p, orderKey: o.orderKey } : p); w.touchedPages.add(page.id);
    return [{ op: "movePage", pageId: page.id, orderKey: page.orderKey }];
  },
  removePage(w, op, i) {
    const o = op as Extract<Op, { op: "removePage" }>;
    const page = w.page(o.pageId); if (!page) invalid("Page does not exist", i);
    if (w.pages.length <= 1) invalid("Cannot delete the last page", i);
    const nodes = w.childIds(page.id, null).flatMap((id) => w.subtree(id));
    if (new TextEncoder().encode(canonicalStringify({ page, nodes })).length + 512 > TX_LIMITS.maxTxBytes) limit("This page is too large for one undoable deletion", i);
    for (const node of nodes) {
      w.delete(node.id); w.touchedNodes.delete(node.id);
      if (!w.inserted.delete(node.id) && !w.restored.delete(node.id)) w.removed.add(node.id);
    }
    w.pages = w.pages.filter((p) => p.id !== page.id); w.touchedPages.delete(page.id);
    if (!w.insertedPages.delete(page.id) && !w.restoredPages.delete(page.id)) w.removedPages.add(page.id);
    return [{ op: "restorePage", page, nodes }];
  },
  restorePage(w, op, i) {
    const o = op as Extract<Op, { op: "restorePage" }>;
    const page = pageContent(w, o.page, i);
    if (w.page(page.id) || w.nodes[page.id as unknown as NodeId] || w.pages.length >= 20 || !Number.isSafeInteger(o.page.layoutVersion) || o.page.layoutVersion < 1) invalid("Page cannot be restored", i);
    const pageVersion = w.removedPages.delete(page.id) ? w.doc.pages.find((p) => p.id === page.id)!.layoutVersion + 1 : o.page.layoutVersion + 1;
    w.pages = [...w.pages, { ...page, layoutVersion: pageVersion }]; w.restoredPages.set(page.id, pageVersion);
    if (!Array.isArray(o.nodes)) invalid("Restored page elements must be an array", i);
    const batch = new Set<NodeId>();
    for (const raw of o.nodes) {
      if (!isPlainObject(raw) || !isUuid(raw.id) || raw.pageId !== page.id || w.nodes[raw.id] || w.page(raw.id) || !Number.isSafeInteger(raw.version) || raw.version < 1 || !isValidOrderKey(raw.orderKey)) invalid("Invalid restored page element", i);
      if (raw.parentId !== null && !batch.has(raw.parentId)) invalid("Restore page elements parents first", i);
      const def = w.registry.get(raw.type); if (def) checkPlacement(w, raw, raw.parentId, def, i);
      guard(w, raw, "Element", i);
      const node = jsonCopy(raw, "Element", i);
      const version = w.removed.delete(node.id) ? w.doc.nodes[node.id].version + 1 : node.version + 1;
      w.put({ ...node, version }); w.restored.set(node.id, version); batch.add(node.id);
    }
    return [{ op: "removePage", pageId: page.id }];
  },
  insertNode(w, op, i) {
    const o = op as Extract<Op, { op: "insertNode" }>;
    if (!isPlainObject(o.node)) invalid("Element must be an object", i);
    insertOne(w, { ...o.node, pageId: o.pageId, parentId: o.parentId, orderKey: o.orderKey }, i);
    return [{ op: "removeNode", id: o.node.id }];
  },

  insertSubtree(w, op, i) {
    const o = op as Extract<Op, { op: "insertSubtree" }>;
    if (!Array.isArray(o.nodes) || !o.nodes.length) invalid("insertSubtree needs at least one element", i);
    const batch = new Set<string>();
    const tops: NodeId[] = [];
    for (const n of o.nodes) {
      if (!isPlainObject(n)) invalid("Element must be an object", i);
      if (n.parentId !== null && batch.has(n.parentId)) {
        // Parent inserted earlier in this batch.
      } else if (n.parentId !== null && o.nodes.some((m) => m.id === n.parentId)) {
        invalid("insertSubtree must list parents before their children", i);
      } else tops.push(n.id);
      insertOne(w, n, i);
      batch.add(n.id);
    }
    return tops.reverse().map((id) => ({ op: "removeNode", id }));
  },

  removeNode(w, op, i) {
    const o = op as Extract<Op, { op: "removeNode" }>;
    w.node(o.id, i);
    const nodes = w.subtree(o.id);
    for (let k = nodes.length - 1; k >= 0; k--) {
      const n = nodes[k];
      w.delete(n.id);
      w.touchedNodes.delete(n.id);
      if (!w.inserted.delete(n.id) && !w.restored.delete(n.id)) w.removed.add(n.id);
    }
    return [{ op: "restoreSubtree", nodes }];
  },

  restoreSubtree(w, op, i) {
    const o = op as Extract<Op, { op: "restoreSubtree" }>;
    if (!Array.isArray(o.nodes) || !o.nodes.length) invalid("restoreSubtree needs at least one element", i);
    const batch = new Set<string>();
    let top: NodeId | null = null;
    for (const raw of o.nodes) {
      if (!isPlainObject(raw) || !isUuid(raw.id)) invalid("Restored elements need their original ids", i);
      if (w.nodes[raw.id]) invalid(`Element ${raw.id} already exists`, i);
      if (!Number.isSafeInteger(raw.version) || raw.version < 1) invalid("Restored elements need their recorded version", i);
      if (!isValidOrderKey(raw.orderKey)) invalid(`Invalid order key "${String(raw.orderKey)}"`, i);
      if (raw.parentId !== null && batch.has(raw.parentId)) {
        if (w.nodes[raw.parentId]?.pageId !== raw.pageId) invalid("An element and its parent must be on the same page", i);
      } else {
        if (top !== null) invalid("restoreSubtree restores exactly one subtree, parents first", i);
        top = raw.id;
        const def = w.registry.get(raw.type);
        // Unknown types restore verbatim; known types keep their placement rules.
        if (def) checkPlacement(w, raw, raw.parentId, def, i);
        else if (!w.page(raw.pageId) || (raw.parentId !== null && w.nodes[raw.parentId]?.pageId !== raw.pageId)) {
          invalid("Restored element's page or parent no longer exists", i);
        }
      }
      const node = jsonCopy(raw, "Element", i);
      const wasRemovedHere = w.removed.delete(node.id);
      const restoredVersion = wasRemovedHere ? w.doc.nodes[node.id].version + 1 : node.version + 1;
      w.put({ ...node, version: restoredVersion });
      if (wasRemovedHere) w.touchedNodes.add(node.id);
      else w.restored.set(node.id, restoredVersion);
      batch.add(node.id);
    }
    return [{ op: "removeNode", id: top! }];
  },

  moveNode(w, op, i) {
    const o = op as Extract<Op, { op: "moveNode" }>;
    const node = w.node(o.id, i);
    const def = definitionFor(w, node, i);
    if (o.parentId !== null && !isNodeId(o.parentId)) invalid("parentId must be a UUID or null", i);
    if (!isValidOrderKey(o.orderKey)) invalid(`Invalid order key "${String(o.orderKey)}"`, i);
    if (o.parentId !== null && w.isAncestorOrSelf(o.id, o.parentId)) invalid("An element cannot be moved inside itself", i);
    checkPlacement(w, node, o.parentId, def, i);
    const inverse: Op[] = [{ op: "moveNode", id: o.id, parentId: node.parentId, orderKey: node.orderKey }];
    if (node.parentId === o.parentId && node.orderKey === o.orderKey) return [];
    w.put({ ...node, parentId: o.parentId, orderKey: o.orderKey });
    w.markNode(o.id);
    return inverse;
  },

  setProp(w, op, i) {
    const o = op as Extract<Op, { op: "setProp" }>;
    const segments = parsePath(o.path, i);
    if (o.value === undefined) invalid("setProp needs a value (use unsetProp to clear)", i);
    const value = jsonCopy(o.value, "Value", i);
    guard(w, value, "Value", i);
    const node = current(w, w.node(o.id, i), i);
    const def = definitionFor(w, node, i);
    const before = readPath(node.props, segments);
    const next = validateContent(w, { ...node, props: writePath(node.props, segments, value, i) }, def, i);
    w.put(next);
    w.markNode(o.id);
    if (before.existing === segments.length) return [{ op: "setProp", id: o.id, path: o.path, value: before.value }];
    return [{ op: "unsetProp", id: o.id, path: segments.slice(0, before.existing + 1).join(".") }];
  },

  unsetProp(w, op, i) {
    const o = op as Extract<Op, { op: "unsetProp" }>;
    const segments = parsePath(o.path, i);
    const node = current(w, w.node(o.id, i), i);
    const def = definitionFor(w, node, i);
    const before = readPath(node.props, segments);
    if (before.existing !== segments.length) return [];
    const next = validateContent(w, { ...node, props: writePath(node.props, segments, undefined, i) }, def, i);
    w.put(next);
    w.markNode(o.id);
    return [{ op: "setProp", id: o.id, path: o.path, value: before.value }];
  },

  setOverride(w, op, i) {
    const o = op as Extract<Op, { op: "setOverride" }>;
    if (!OVERRIDE_DEVICES.includes(o.device)) invalid(`Unknown device "${String(o.device)}"`, i);
    if (typeof o.key !== "string" || !o.key || RESERVED_PROP_KEYS.has(o.key) || FORBIDDEN_PATH_SEGMENTS.has(o.key)) invalid(`Invalid override key "${String(o.key)}"`, i);
    if (o.value === undefined) invalid("setOverride needs a value (use clearOverride to clear)", i);
    const node = current(w, w.node(o.id, i), i);
    const def = definitionFor(w, node, i);
    if (!def.capabilities.has("responsive.overrides")) invalid(`"${def.displayName}" does not support per-device settings`, i);
    if (!overridableKeys(def).has(o.key)) invalid(`${def.displayName}: "${o.key}" cannot be set per device`, i);
    const value = jsonCopy(o.value, "Value", i);
    guard(w, value, "Value", i);
    const bucket = node.overrides[o.device] ?? {};
    const old = bucket[o.key];
    const next = validateContent(w, { ...node, overrides: { ...node.overrides, [o.device]: { ...bucket, [o.key]: value } } }, def, i);
    w.put(next);
    w.markNode(o.id);
    return old !== undefined
      ? [{ op: "setOverride", id: o.id, device: o.device, key: o.key, value: old }]
      : [{ op: "clearOverride", id: o.id, device: o.device, key: o.key }];
  },

  clearOverride(w, op, i) {
    const o = op as Extract<Op, { op: "clearOverride" }>;
    if (!OVERRIDE_DEVICES.includes(o.device)) invalid(`Unknown device "${String(o.device)}"`, i);
    const node = current(w, w.node(o.id, i), i);
    const def = definitionFor(w, node, i);
    const bucket = node.overrides[o.device];
    if (!bucket) return [];
    const keys = o.key === undefined ? Object.keys(bucket).sort() : Object.prototype.hasOwnProperty.call(bucket, o.key) ? [o.key] : [];
    if (!keys.length) return [];
    const nextBucket = { ...bucket };
    for (const k of keys) delete nextBucket[k];
    const overrides = { ...node.overrides };
    if (Object.keys(nextBucket).length) overrides[o.device] = nextBucket;
    else delete overrides[o.device];
    // Clearing never needs content validation, but legacy nodes still pass their boundary.
    w.put(def.writePolicy === "legacy-3b-boundary" ? validateContent(w, { ...node, overrides }, def, i) : { ...node, overrides });
    w.markNode(o.id);
    return keys.map((key) => ({ op: "setOverride", id: o.id, device: o.device, key, value: bucket[key] }));
  },

  setDeviceComposition(w, op, i) {
    const o = op as Extract<Op, { op: "setDeviceComposition" }>;
    if (!OVERRIDE_DEVICES.includes(o.device)) invalid(`Unknown device "${String(o.device)}"`, i);
    const page = w.page(o.pageId);
    if (!page) invalid(`Page ${o.pageId} does not exist`, i);
    const next = o.composition === null ? null : parseOrFail(deviceCompositionSchema, o.composition, "Device layout", i);
    const old = page!.deviceLayout[o.device] ?? null;
    const deviceLayout = { ...page!.deviceLayout };
    if (next === null || (!next.order && !next.hidden)) delete deviceLayout[o.device];
    else deviceLayout[o.device] = next as DeviceComposition;
    w.pages = w.pages.map((p) => (p.id === o.pageId ? { ...p, deviceLayout } : p));
    w.touchedPages.add(o.pageId);
    return [{ op: "setDeviceComposition", pageId: o.pageId, device: o.device, composition: old }];
  },

  setA11y(w, op, i) {
    return setField(w, op as Extract<Op, { op: "setA11y" }>, i, "a11y", (v) => parseOrFail<NodeA11y>(nodeA11ySchema, v, "Accessibility", i));
  },
  setVisibility(w, op, i) {
    return setField(w, op as Extract<Op, { op: "setVisibility" }>, i, "visibility", (v) => parseOrFail<NodeVisibility>(nodeVisibilitySchema, v, "Visibility", i));
  },
  setLocked(w, op, i) {
    return setField(w, op as Extract<Op, { op: "setLocked" }>, i, "locked", (v) => (typeof v === "boolean" ? v : invalid("locked must be true or false", i)));
  },
  setMotion(w, op, i) { return setField(w, op as Extract<Op, { op: "setMotion" }>, i, "motion", v => v); },
  setInteraction(w, op, i) { return setField(w, op as Extract<Op, { op: "setInteraction" }>, i, "interaction", v => v); },
  setResponsiveState(w, op, i) {
    return setField(w, op as Extract<Op, { op: "setResponsiveState" }>, i, "responsiveState", (v) => parseOrFail(responsiveStateSchema, v, "Responsive state", i));
  },
};

/** Metadata operations use null (or undefined) to remove the field. */
function setField(
  w: Working,
  o: { op: "setA11y" | "setVisibility" | "setLocked" | "setResponsiveState" | "setMotion" | "setInteraction"; id: NodeId; value: unknown },
  i: number,
  field: "a11y" | "visibility" | "locked" | "responsiveState" | "motion" | "interaction",
  parse: (v: unknown) => unknown,
): Op[] {
  const node = current(w, w.node(o.id, i), i);
  const def = definitionFor(w, node, i);
  if ((field === "motion" || field === "interaction") && !["section", "group", "text", "image", "video"].includes(node.type)) invalid("Native effects require a native element", i);
  const value = o.value === null || o.value === undefined ? undefined : parse(o.value);
  guard(w, value, "Value", i);
  const next: KcdNode = { ...node };
  if (value === undefined) delete next[field];
  else (next as unknown as Record<string, unknown>)[field] = value;
  w.put(validateContent(w, next, def, i));
  w.markNode(o.id);
  return [{ op: o.op, id: o.id, value: node[field] ?? null }];
}

// ── Transaction ───────────────────────────────────────────────────────────────

function checkTransactionShape(tx: Transaction) {
  if (!isPlainObject(tx)) invalid("Transaction must be an object");
  if (!isUuid(tx.txId)) invalid("txId must be a UUID");
  if (!["user", "ai", "system", "migration"].includes(tx.origin)) invalid(`Unknown origin "${String(tx.origin)}"`);
  if (typeof tx.label !== "string" || tx.label.length > TX_LIMITS.maxLabelLength) invalid("label must be a short string");
  if (!Array.isArray(tx.ops) || !tx.ops.length) invalid("A transaction needs at least one operation");
  if (tx.ops.length > TX_LIMITS.maxOps) limit(`Too many operations (${tx.ops.length} > ${TX_LIMITS.maxOps})`);
  if (!isPlainObject(tx.expect)) invalid("expect must be an object");
  for (const [id, v] of Object.entries(tx.expect)) {
    if (!Number.isSafeInteger(v) || v < 1) invalid(`Invalid expected version for ${id}`);
  }
  tx.ops.forEach((op, i) => {
    if (!isPlainObject(op) || typeof op.op !== "string" || !Object.prototype.hasOwnProperty.call(STEPS, op.op)) invalid(`Unknown operation "${String((op as { op?: unknown })?.op)}"`, i);
  });
  let bytes: number;
  try {
    bytes = canonicalStringify(tx).length;
  } catch (e) {
    return invalid(`Transaction is not JSON: ${(e as Error).message}`);
  }
  if (bytes > TX_LIMITS.maxTxBytes) limit(`Transaction too large (${bytes} bytes)`);
}

function checkVersions(doc: KcdDocument, tx: Transaction) {
  const conflicts: { id: string; expected: number | null; actual: number }[] = [];
  for (const id of addressedIds(doc, tx.ops)) {
    const node = doc.nodes[id as NodeId];
    const actual = node ? node.version : doc.pages.find((p) => p.id === id)!.layoutVersion;
    const expected = tx.expect[id];
    if (expected === undefined) invalid(`Missing expected version for ${id}`);
    if (expected !== actual) conflicts.push({ id, expected, actual });
  }
  if (conflicts.length) {
    throw new TxFailure({ code: "KCD_CONFLICT", message: "Changed elsewhere — reload to continue", conflicts });
  }
}

/** Sibling uniqueness, child limits and rebalance for every parent whose children changed. */
function finishSlots(w: Working, inverse: Op[]): (NodeId | PageId)[] {
  const rebalanced: (NodeId | PageId)[] = [];
  for (const key of [...w.structuralSlots].sort()) {
    const [pageId, parent] = key.split("|");
    const parentId = (parent || null) as NodeId | null;
    if (parentId !== null && !w.nodes[parentId]) continue; // parent removed in this transaction
    const kids = w.childIds(pageId, parentId).map((id) => w.nodes[id]).sort(compareOrder);
    for (let k = 1; k < kids.length; k++) {
      if (kids[k].orderKey === kids[k - 1].orderKey) invalid(`Two elements share the position "${kids[k].orderKey}"`);
    }
    if (parentId !== null) {
      const def = w.registry.get(w.nodes[parentId].type);
      if (def && def.children !== "none" && def.children.max !== undefined && kids.length > def.children.max) {
        invalid(`"${def.displayName}" can hold at most ${def.children.max} elements`);
      }
    }
    if (!needsRebalance(kids.map((n) => n.orderKey))) continue;
    const keys = evenlySpacedKeys(kids.length);
    const restore: Op[] = [];
    kids.forEach((node, k) => {
      if (node.orderKey === keys[k]) return;
      restore.push({ op: "moveNode", id: node.id, parentId: node.parentId, orderKey: node.orderKey });
      w.nodes[node.id] = { ...node, orderKey: keys[k] };
      w.markNode(node.id);
    });
    inverse.unshift(...restore);
    rebalanced.push((parentId ?? pageId) as NodeId | PageId);
  }
  return rebalanced;
}

/**
 * Apply a transaction to a confirmed document. Never mutates `doc`.
 */
export function applyTransaction(doc: KcdDocument, tx: Transaction, registry: Registry, options: ApplyOptions = {}): ApplyResult {
  try {
    checkTransactionShape(tx);
    checkVersions(doc, tx);
    const w = new Working(doc, registry, options);
    const inverse: Op[] = [];
    tx.ops.forEach((op, i) => {
      const inv = STEPS[op.op](w, op, i);
      inverse.unshift(...inv);
    });
    const rebalanced = finishSlots(w, inverse);
    if (w.pages.length < 1 || w.pages.length > 20) invalid("Sites need 1–20 pages");
    const slugs = new Set<string>(), positions = new Set<string>();
    for (const page of w.pages) {
      if (slugs.has(page.slug) || positions.has(page.orderKey) || w.nodes[page.id as unknown as NodeId]) invalid("Page slug, position or identity is duplicated");
      slugs.add(page.slug); positions.add(page.orderKey);
    }

    const versions: Record<string, number> = {};
    for (const id of w.touchedNodes) {
      const next = doc.nodes[id].version + 1;
      w.nodes[id] = { ...w.nodes[id], version: next };
      versions[id] = next;
    }
    for (const id of w.inserted) {
      w.nodes[id] = { ...w.nodes[id], version: 1 };
      versions[id] = 1;
    }
    for (const [id, v] of w.restored) versions[id] = v;
    let pages = w.pages;
    if (w.touchedPages.size) {
      pages = pages.map((p) => {
        if (!w.touchedPages.has(p.id) || w.insertedPages.has(p.id) || w.restoredPages.has(p.id)) return p;
        versions[p.id] = p.layoutVersion + 1;
        return { ...p, layoutVersion: p.layoutVersion + 1 };
      });
    }
    for (const id of w.insertedPages) versions[id] = 1;
    for (const [id, version] of w.restoredPages) versions[id] = version;
    if (tx.ops.some((op) => ["insertPage", "movePage", "removePage", "restorePage"].includes(op.op))) pages = [...pages].sort((a, b) => a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0);
    return {
      ok: true,
      document: { ...doc, pages, nodes: w.nodes },
      inverse,
      versions,
      removed: [...w.removed].sort(),
      ...(w.removedPages.size ? { removedPages: [...w.removedPages].sort() } : {}),
      rebalanced,
    };
  } catch (e) {
    if (e instanceof TxFailure) return { ok: false, error: e.error };
    throw e;
  }
}

/** Inverse ops of `ops` against `doc` (the confirmed pre-state). Throws if the ops are invalid. */
export function invertOps(doc: KcdDocument, ops: Op[], registry: Registry, options: ApplyOptions = {}): Op[] {
  const result = applyTransaction(
    doc,
    { txId: "00000000-0000-4000-8000-000000000000", origin: "system", label: "invert", ops, expect: expectFor(doc, ops) },
    registry,
    options,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.inverse;
}

/**
 * Duplicate = insertSubtree with NEW ids (identity is never copied). The copy of `id` is placed
 * under `parentId` at `orderKey`; descendants keep their relative order and content.
 */
export function duplicateSubtreeOp(
  doc: KcdDocument,
  id: NodeId,
  placement: { parentId: NodeId | null; orderKey: string },
  newId: () => NodeId,
): Extract<Op, { op: "insertSubtree" }> {
  const source = doc.nodes[id];
  if (!source) throw new Error(`Element ${id} does not exist`);
  const byParent = new Map<string, KcdNode[]>();
  for (const n of Object.values(doc.nodes)) {
    if (n.parentId === null) continue;
    const list = byParent.get(n.parentId);
    if (list) list.push(n);
    else byParent.set(n.parentId, [n]);
  }
  const ids = new Map<NodeId, NodeId>();
  const nodes: NewPlacedNode[] = [];
  const visit = (n: KcdNode, parentId: NodeId | null, orderKey: string) => {
    const copyId = newId();
    ids.set(n.id, copyId);
    const { version: _version, ...rest } = structuredClone(n);
    void _version;
    nodes.push({ ...rest, id: copyId, parentId, orderKey });
    for (const child of (byParent.get(n.id) ?? []).sort(compareOrder)) visit(child, copyId, child.orderKey);
  };
  visit(source, placement.parentId, placement.orderKey);
  // Native order references must follow copied identities, including device overrides.
  for (const copy of nodes) if (copy.type === "section" || copy.type === "group") {
    for (const props of [copy.props, ...Object.values(copy.overrides)]) if (Array.isArray(props?.childOrder)) props.childOrder = props.childOrder.map(id => ids.get(id as NodeId) ?? id);
  }
  return { op: "insertSubtree", nodes };
}

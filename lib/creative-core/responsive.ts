/**
 * Responsive inheritance — the exact 3B contract (3C DESIGN FREEZE §5, D4).
 *
 *   • Desktop is the base. Tablet and Phone each fall back to DESKTOP, never to each other.
 *   • Per-key replacement, no deep merge (3B `readDeviceOverride` / `mergeDeviceAwareSectionProps`).
 *   • Root order per device: listed ids first in the listed order, then the remaining roots in
 *     base order; pinned chrome first/last (3B `orderSectionsForDevice`).
 *   • Hidden: props.hidden, the page's hidden list for the device, or node visibility
 *     (3B `isSectionVisibleOnDevice`).
 *
 * Which stored override keys apply:
 *   • legacy sections (and nodes without a known definition) — every stored key, exactly as 3B
 *     renders them today;
 *   • native primitives ("reject-unknown") — only keys the type declares overridable. Other
 *     stored keys are preserved and reported by `inertOverrideKeys`, never applied.
 */
import type { Device, KcdDocument, KcdNode, KcdPage, NodeId, PageId } from "./model";
import type { NodeTypeDefinition } from "./registry";
import { overridableKeys } from "./registry";
import { roots } from "./tree";

function appliesAllStoredKeys(def: NodeTypeDefinition | undefined): boolean {
  return !def || def.writePolicy !== "reject-unknown";
}

/** Resolved value of one prop on `device`. */
export function resolveProp(node: KcdNode, device: Device, key: string, def?: NodeTypeDefinition): unknown {
  if (device === "desktop") return node.props[key];
  const bucket = node.overrides[device];
  if (bucket && (appliesAllStoredKeys(def) || overridableKeys(def!).has(key))) {
    const o = bucket[key];
    if (o !== undefined) return o;
  }
  return node.props[key];
}

/** Base props with the device's override keys replaced (shallow, per key). */
export function resolveNode(node: KcdNode, device: Device, def?: NodeTypeDefinition): Record<string, unknown> {
  if (device === "desktop") return node.props;
  const bucket = node.overrides[device];
  if (!bucket) return node.props;
  if (appliesAllStoredKeys(def)) {
    const out: Record<string, unknown> = { ...node.props };
    for (const [k, v] of Object.entries(bucket)) if (v !== undefined) out[k] = v;
    return out;
  }
  const allowed = overridableKeys(def!);
  let out: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(bucket)) {
    if (v === undefined || !allowed.has(k)) continue;
    out ??= { ...node.props };
    out[k] = v;
  }
  return out ?? node.props;
}

/** Stored override keys that are not applied (native primitives only) — surfaced, never dropped. */
export function inertOverrideKeys(node: KcdNode, def: NodeTypeDefinition | undefined): { device: "tablet" | "mobile"; key: string }[] {
  if (appliesAllStoredKeys(def)) return [];
  const allowed = overridableKeys(def!);
  const out: { device: "tablet" | "mobile"; key: string }[] = [];
  for (const device of ["tablet", "mobile"] as const) {
    for (const key of Object.keys(node.overrides[device] ?? {}).sort()) {
      if (!allowed.has(key)) out.push({ device, key });
    }
  }
  return out;
}

/** Ids listed for a device — tolerant of malformed persisted lists (3B `listedIds`). */
function listedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const id of value) if (typeof id === "string" && id && !seen.has(id)) seen.add(id);
  return [...seen];
}

export interface RootOrderOptions {
  /** Roots kept first on every device (site-chrome header). */
  pinnedFirst?: ReadonlySet<string>;
  /** Roots kept last on every device (site-chrome footer). */
  pinnedLast?: ReadonlySet<string>;
}

/**
 * Order `baseOrder` (roots in Desktop order) for `device` using the page's composition.
 * Pure over the given list, so callers may pass pre-filtered or synthesized roots.
 */
export function orderRootsForDevice<T extends { id: string }>(
  baseOrder: readonly T[],
  page: Pick<KcdPage, "deviceLayout">,
  device: Device,
  options: RootOrderOptions = {},
): T[] {
  const first = baseOrder.filter((n) => options.pinnedFirst?.has(n.id));
  const last = baseOrder.filter((n) => options.pinnedLast?.has(n.id) && !options.pinnedFirst?.has(n.id));
  const body = baseOrder.filter((n) => !options.pinnedFirst?.has(n.id) && !options.pinnedLast?.has(n.id));
  const order = device === "desktop" ? [] : listedIds(page.deviceLayout[device]?.order);
  if (!order.length) return [...first, ...body, ...last];
  const rank = new Map(order.map((id, i) => [id, i]));
  const listed = body.filter((n) => rank.has(n.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  const unlisted = body.filter((n) => !rank.has(n.id));
  return [...first, ...listed, ...unlisted, ...last];
}

/** Page roots in `device` order. */
export function rootOrder(doc: KcdDocument, pageId: PageId, device: Device, options: RootOrderOptions = {}): KcdNode[] {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Unknown page ${pageId}`);
  return orderRootsForDevice(roots(doc, pageId), page, device, options);
}

/** Whether a node renders on `device` (hidden prop, page hidden list, node visibility). */
export function isVisible(node: KcdNode, page: Pick<KcdPage, "deviceLayout">, device: Device): boolean {
  if (node.props.hidden === true) return false;
  if (device !== "desktop" && listedIds(page.deviceLayout[device]?.hidden).includes(node.id)) return false;
  const vis = node.visibility;
  if (Array.isArray(vis?.hideOn) && vis.hideOn.includes(device)) return false;
  if (Array.isArray(vis?.showOn) && !vis.showOn.includes(device)) return false;
  return true;
}

/** Ordered, visible roots for one device (editor canvas / preview). */
export function composeRoots(doc: KcdDocument, pageId: PageId, device: Device, options: RootOrderOptions = {}): KcdNode[] {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Unknown page ${pageId}`);
  return rootOrder(doc, pageId, device, options).filter((n) => isVisible(n, page, device));
}

/** Convenience: the node ids of `composeRoots`. */
export function composedRootIds(doc: KcdDocument, pageId: PageId, device: Device, options?: RootOrderOptions): NodeId[] {
  return composeRoots(doc, pageId, device, options).map((n) => n.id);
}

/** Listed live children first; new/unlisted children follow canonical order keys. */
export function orderChildrenForDevice<T extends { id: string }>(baseOrder: readonly T[], parent: KcdNode, device: Device, def?: NodeTypeDefinition): T[] {
  const order = listedIds(resolveProp(parent, device, "childOrder", def));
  if (!order.length) return [...baseOrder];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...baseOrder.filter(child => rank.has(child.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!), ...baseOrder.filter(child => !rank.has(child.id))];
}

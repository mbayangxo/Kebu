/**
 * Node type registry + capability negotiation (3C DESIGN FREEZE §3).
 *
 * Central rule: what the editor offers for a node is the INTERSECTION of the node type's
 * capabilities and the active renderer's capabilities. A stored value whose capability the
 * renderer cannot realize is never silently ignored: it is preserved, reported, and blocks
 * publishing (see `preflight`).
 */
import type { ZodType } from "zod";
import type { KcdDocument, KcdNode, NodeA11y, NodeId, NodeTypeId } from "./model";
import { isNodeTypeId } from "./model";

export const CAPABILITIES = [
  "layout.flow",
  "layout.positioned",
  "nesting",
  "responsive.overrides",
  "text.edit",
  "media",
  "typography",
  "fill",
  "effects",
  "mask",
  "a11y",
  "links",
  "motion",
  "interaction",
  "component",
  "dataBinding",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface PropertyDescriptor {
  /** Prop path. */
  key: string;
  /** Required accessible label — every inspector control has one by construction. */
  label: string;
  control: "video" | "rich-text" | "text" | "textarea" | "select" | "color" | "number" | "range" | "toggle" | "media" | "link" | "order";
  /** The control exists only if the type AND the renderer support this capability. */
  capability: Capability;
  /** May be set per device. */
  overridable: boolean;
  group?: "content" | "layout" | "style" | "a11y" | "advanced";
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export type WriteResult = { ok: true; props: Record<string, unknown> } | { ok: false; error: string; issues?: unknown };

export interface NodeTypeDefinition<P = Record<string, unknown>> {
  type: NodeTypeId;
  version: number;
  displayName: string;
  capabilities: ReadonlySet<Capability>;
  /** Known props. */
  propsSchema: ZodType<P>;
  /**
   * "reject-unknown": native primitives — propsSchema must be strict; unknown keys are rejected.
   * "legacy-3b-boundary": legacy sections — `validateWrite` is the 3B `sectionPropsForSave`
   * boundary, injected by the adapter (the core cannot import lib/create).
   */
  writePolicy: "reject-unknown" | "legacy-3b-boundary";
  /**
   * Required for "legacy-3b-boundary"; ignored otherwise. Receives the node as it would be after
   * the write; the adapter repacks it into the 3B stored props shape and runs the 3B boundary.
   * The core only accepts or rejects — it never adopts the boundary's normalized output, so the
   * core itself strips nothing (legacy stripping happens at the persistence boundary, as in 3B).
   */
  validateWrite?: (node: KcdNode) => WriteResult;
  properties: ReadonlyArray<PropertyDescriptor>;
  children: "none" | { allow: ReadonlyArray<NodeTypeId>; max?: number };
  /** Where the node may sit: only at page root, anywhere, or never at root. */
  placement: "root" | "any" | "nested";
  /** Ordered pure migrations; `up` receives and returns props. */
  migrations: ReadonlyArray<{ from: number; to: number; up: (props: unknown) => unknown }>;
  a11yDefaults?: Partial<NodeA11y>;
}

/** What a renderer can actually realize. Negotiated against the registry. */
export interface RendererManifest {
  renderer: "web-dom" | (string & {});
  version: number;
  supports: (type: NodeTypeId, capability: Capability) => boolean;
  supportsNodeType: (type: NodeTypeId, typeVersion: number) => boolean;
}

export interface Registry {
  get(type: NodeTypeId): NodeTypeDefinition | undefined;
  has(type: NodeTypeId): boolean;
  types(): NodeTypeId[];
}

/** Build an immutable registry; definitions are checked for internal consistency. */
export function createRegistry(definitions: Iterable<NodeTypeDefinition>): Registry {
  const map = new Map<NodeTypeId, NodeTypeDefinition>();
  for (const def of definitions) {
    assertDefinition(def);
    if (map.has(def.type)) throw new Error(`Duplicate node type "${def.type}"`);
    map.set(def.type, def);
  }
  return {
    get: (type) => map.get(type),
    has: (type) => map.has(type),
    types: () => [...map.keys()].sort(),
  };
}

function assertDefinition(def: NodeTypeDefinition): void {
  const where = `Node type "${def.type}"`;
  if (!isNodeTypeId(def.type)) throw new Error(`${where}: invalid type id`);
  if (!Number.isInteger(def.version) || def.version < 1) throw new Error(`${where}: version must be an integer ≥ 1`);
  if (!def.displayName.trim()) throw new Error(`${where}: displayName is required`);
  if (def.writePolicy === "legacy-3b-boundary" && !def.validateWrite) {
    throw new Error(`${where}: legacy-3b-boundary requires validateWrite`);
  }
  const keys = new Set<string>();
  for (const p of def.properties) {
    if (keys.has(p.key)) throw new Error(`${where}: duplicate property "${p.key}"`);
    keys.add(p.key);
    if (!p.label.trim()) throw new Error(`${where}: property "${p.key}" has no accessible label`);
    if (!def.capabilities.has(p.capability)) {
      throw new Error(`${where}: property "${p.key}" needs capability "${p.capability}" the type does not declare`);
    }
    if (p.overridable && !def.capabilities.has("responsive.overrides")) {
      throw new Error(`${where}: property "${p.key}" is overridable but the type lacks "responsive.overrides"`);
    }
    if (p.control === "select" && !p.options?.length) throw new Error(`${where}: select "${p.key}" has no options`);
  }
  if (def.children !== "none" && !def.capabilities.has("nesting")) {
    throw new Error(`${where}: children are allowed but the type lacks "nesting"`);
  }
  // Migrations must form the contiguous chain 1 → 2 → … → version.
  const sorted = [...def.migrations].sort((a, b) => a.from - b.from);
  sorted.forEach((m, i) => {
    if (m.from !== i + 1 || m.to !== m.from + 1) throw new Error(`${where}: migrations must step n → n+1 from 1`);
  });
  if (sorted.length !== def.version - 1) throw new Error(`${where}: expected ${def.version - 1} migrations, got ${sorted.length}`);
}

/** Overridable property keys for a type. */
export function overridableKeys(def: NodeTypeDefinition): ReadonlySet<string> {
  return new Set(def.properties.filter((p) => p.overridable).map((p) => p.key));
}

// ── Negotiation ───────────────────────────────────────────────────────────────

/** Rule 1: controls shown = type capability ∩ renderer capability. */
export function inspectorControls(def: NodeTypeDefinition, manifest: RendererManifest): PropertyDescriptor[] {
  return def.properties.filter((p) => def.capabilities.has(p.capability) && manifest.supports(def.type, p.capability));
}

/** A capability is effective for a type when both the type and the renderer support it. */
export function effectiveCapabilities(def: NodeTypeDefinition, manifest: RendererManifest): Set<Capability> {
  return new Set([...def.capabilities].filter((c) => manifest.supports(def.type, c)));
}

/** Capabilities a node's STORED data depends on (extension fields, device data, descriptor-governed props). */
export function storedCapabilities(node: KcdNode, def: NodeTypeDefinition | undefined): Set<Capability> {
  const used = new Set<Capability>();
  if (node.motion !== undefined) used.add("motion");
  if (node.interaction !== undefined) used.add("interaction");
  if (node.dataBinding !== undefined) used.add("dataBinding");
  if (node.a11y !== undefined) used.add("a11y");
  if (node.visibility !== undefined || hasOverrideValues(node)) used.add("responsive.overrides");
  if (def) {
    for (const p of def.properties) {
      if (p.key in node.props) used.add(p.capability);
    }
  }
  return used;
}

function hasOverrideValues(node: KcdNode): boolean {
  return Object.values(node.overrides).some((bucket) => bucket && Object.keys(bucket).length > 0);
}

export type PreflightIssue =
  | { code: "unknown-type"; nodeId: NodeId; type: NodeTypeId; message: string }
  | { code: "unsupported-version"; nodeId: NodeId; type: NodeTypeId; typeVersion: number; message: string }
  | { code: "renderer-node-type"; nodeId: NodeId; type: NodeTypeId; message: string }
  | { code: "renderer-capability"; nodeId: NodeId; type: NodeTypeId; capability: Capability; message: string };

/**
 * Publish preflight (rules 2 and 3): lists every node the renderer cannot faithfully realize.
 * An empty list means the document can be published with this renderer.
 */
export function preflight(doc: KcdDocument, registry: Registry, manifest: RendererManifest): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const ids = Object.keys(doc.nodes).sort() as NodeId[];
  for (const id of ids) {
    const node = doc.nodes[id];
    const def = registry.get(node.type);
    if (!def) {
      if (!manifest.supportsNodeType(node.type, node.typeVersion)) {
        issues.push({ code: "unknown-type", nodeId: id, type: node.type, message: `Unknown element type "${node.type}".` });
      }
      continue;
    }
    if (node.typeVersion > def.version) {
      issues.push({
        code: "unsupported-version",
        nodeId: id,
        type: node.type,
        typeVersion: node.typeVersion,
        message: `"${def.displayName}" was saved by a newer version of Kebu (v${node.typeVersion}).`,
      });
      continue;
    }
    if (!manifest.supportsNodeType(node.type, def.version)) {
      issues.push({
        code: "renderer-node-type",
        nodeId: id,
        type: node.type,
        message: `"${def.displayName}" cannot be displayed by the ${manifest.renderer} renderer.`,
      });
      continue;
    }
    for (const capability of [...storedCapabilities(node, def)].sort()) {
      if (!def.capabilities.has(capability) || !manifest.supports(node.type, capability)) {
        issues.push({
          code: "renderer-capability",
          nodeId: id,
          type: node.type,
          capability,
          message: `"${def.displayName}" uses ${CAPABILITY_LABELS[capability]}, which is not supported by the ${manifest.renderer} renderer.`,
        });
      }
    }
  }
  return issues;
}

/** Plain-language capability names for user-facing messages. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  "layout.flow": "flow layout",
  "layout.positioned": "free positioning",
  nesting: "nested elements",
  "responsive.overrides": "per-device settings",
  "text.edit": "text editing",
  media: "media",
  typography: "typography",
  fill: "fills",
  effects: "effects",
  mask: "masks",
  a11y: "accessibility settings",
  links: "links",
  motion: "motion",
  interaction: "interactions",
  component: "components",
  dataBinding: "data connections",
};

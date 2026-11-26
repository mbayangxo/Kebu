/**
 * Node type migrations (3C DESIGN FREEZE §9).
 *
 * Each type declares ordered pure migrations n → n+1. They run on read, in memory; stored rows
 * are never bulk-rewritten (the node's next write persists the new typeVersion). Migrating a
 * node already at the target version returns it unchanged (idempotent).
 *
 * A node the registry cannot bring to the current version is "unsupported": its data is kept
 * verbatim, the editor shows a placeholder, and publishing is blocked (registry.preflight).
 */
import type { KcdDocument, KcdNode, NodeId } from "./model";
import type { Registry } from "./registry";

export type NodeMigration =
  | { status: "current"; node: KcdNode }
  | { status: "migrated"; node: KcdNode; from: number; to: number }
  | { status: "unsupported"; node: KcdNode; reason: "unknown-type" | "newer-version" | "migration-failed"; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function migrateNode(node: KcdNode, registry: Registry): NodeMigration {
  const def = registry.get(node.type);
  if (!def) return { status: "unsupported", node, reason: "unknown-type", message: `Unknown element type "${node.type}".` };
  if (node.typeVersion === def.version) return { status: "current", node };
  if (node.typeVersion > def.version) {
    return {
      status: "unsupported",
      node,
      reason: "newer-version",
      message: `"${def.displayName}" v${node.typeVersion} is newer than this editor (v${def.version}).`,
    };
  }
  let props: unknown = structuredClone(node.props);
  let version = node.typeVersion;
  try {
    while (version < def.version) {
      const step = def.migrations.find((m) => m.from === version);
      if (!step) throw new Error(`No migration from v${version}`);
      props = step.up(props);
      if (!isRecord(props)) throw new Error(`Migration v${version} → v${step.to} did not return an object`);
      version = step.to;
    }
  } catch (e) {
    return {
      status: "unsupported",
      node,
      reason: "migration-failed",
      message: `"${def.displayName}" could not be upgraded from v${node.typeVersion}: ${(e as Error).message}`,
    };
  }
  return { status: "migrated", node: { ...node, props: props as Record<string, unknown>, typeVersion: version }, from: node.typeVersion, to: version };
}

export interface DocumentMigration {
  document: KcdDocument;
  migrated: NodeId[];
  unsupported: { id: NodeId; reason: "unknown-type" | "newer-version" | "migration-failed"; message: string }[];
}

/** Migrate every node in memory. Unsupported nodes stay exactly as stored. */
export function migrateDocument(doc: KcdDocument, registry: Registry): DocumentMigration {
  const nodes: KcdDocument["nodes"] = {};
  const migrated: NodeId[] = [];
  const unsupported: DocumentMigration["unsupported"] = [];
  for (const id of Object.keys(doc.nodes).sort() as NodeId[]) {
    const result = migrateNode(doc.nodes[id], registry);
    nodes[id] = result.node;
    if (result.status === "migrated") migrated.push(id);
    if (result.status === "unsupported") unsupported.push({ id, reason: result.reason, message: result.message });
  }
  return { document: migrated.length ? { ...doc, nodes } : doc, migrated, unsupported };
}

import { canonicalStringify, checkStructure, documentToJson, isNodeId, parseDocument, type KcdDocument, type KcdNode, type NodeId } from "@/lib/creative-core";

export type KcdPreviewUpdate =
  | { kind: "clear"; sequence: number }
  | { kind: "full"; sequence: number; document: KcdDocument }
  | { kind: "delta"; sequence: number; base: number; metadata: Omit<KcdDocument, "nodes">; nodes: KcdNode[]; removed: NodeId[] };

/** Send only changed native/legacy nodes; the document remains the canonical KCD model. */
export function kcdPreviewUpdate(previous: KcdDocument | null, document: KcdDocument | null, sequence: number, base: number): KcdPreviewUpdate {
  if (!document) return { kind: "clear", sequence };
  if (!previous || previous.id !== document.id) return { kind: "full", sequence, document };
  const { nodes, ...metadata } = document;
  return { kind: "delta", sequence, base, metadata,
    nodes: Object.values(nodes).filter((node) => previous.nodes[node.id] !== node),
    removed: Object.keys(previous.nodes).filter((id) => !nodes[id as NodeId]) as NodeId[] };
}

/** undefined means a malformed/stale update; null means an intentional native-source clear. */
function applyUpdate(previous: KcdDocument | null, sequence: number, update: KcdPreviewUpdate): KcdDocument | null | undefined {
  if (!update || !Number.isSafeInteger(update.sequence) || update.sequence <= sequence) return undefined;
  if (update.kind === "clear") return null;
  if (update.kind === "full") {
    const parsed = parseDocument(documentToJson(update.document));
    return parsed.ok ? parsed.document : undefined;
  }
  if (update.kind !== "delta" || !previous || update.base !== sequence || update.sequence !== sequence + 1 || update.metadata?.id !== previous.id || !Array.isArray(update.nodes) || !Array.isArray(update.removed)) return undefined;
  const nodes = { ...previous.nodes };
  const seen = new Set<string>();
  for (const node of update.nodes) {
    if (!isNodeId(node?.id) || seen.has(node.id) || update.removed.includes(node.id)) return undefined;
    seen.add(node.id); nodes[node.id] = node;
  }
  if (new Set(update.removed).size !== update.removed.length || update.removed.some((id) => !isNodeId(id) || !previous.nodes[id])) return undefined;
  for (const id of update.removed) delete nodes[id];
  // Validate changed payloads and their ancestor structure without serializing unchanged props.
  const context = Object.fromEntries(update.nodes.map(node => [node.id, node])) as Record<NodeId, KcdNode>;
  for (const changed of update.nodes) {
    let parent = changed.parentId;
    const visited = new Set<NodeId>();
    while (parent && nodes[parent] && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = nodes[parent];
      if (!context[parent]) context[parent] = { id: ancestor.id, type: ancestor.type, typeVersion: ancestor.typeVersion, pageId: ancestor.pageId, parentId: ancestor.parentId, orderKey: ancestor.orderKey, version: ancestor.version, props: {}, overrides: {} };
      parent = ancestor.parentId;
    }
  }
  const parsed = parseDocument(documentToJson({ ...update.metadata, nodes: context }));
  if (!parsed.ok) return undefined;
  for (const changed of update.nodes) nodes[changed.id] = parsed.document.nodes[changed.id];
  parsed.document.nodes = nodes;
  if (checkStructure(parsed.document).length) return undefined;
  parsed.document.pages = parsed.document.pages.map(page => {
    const prior = previous.pages.find(candidate => candidate.id === page.id);
    return prior && canonicalStringify(prior) === canonicalStringify(page) ? prior : page;
  });
  return parsed.document;
}

export function applyKcdPreviewUpdate(previous: KcdDocument | null, sequence: number, update: KcdPreviewUpdate): KcdDocument | null | undefined {
  try { return applyUpdate(previous, sequence, update); } catch { return undefined; }
}

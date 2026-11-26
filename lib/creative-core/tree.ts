/**
 * Tree reads over the normalized node map. Siblings are ordered by (orderKey, id).
 *
 * `buildIndex` groups every node by parent in one linear pass; use it when walking a whole
 * page (renderers, validation). The one-off helpers scan the map and suit single lookups.
 */
import type { KcdDocument, KcdNode, NodeId, PageId } from "./model";
import { compareOrder } from "./order-keys";

export interface DocIndex {
  /** Ordered children of `parentId` (null = page roots of `pageId`). */
  children(pageId: PageId, parentId: NodeId | null): readonly KcdNode[];
  /** `id` and all its descendants, parents before children, siblings in order. */
  subtree(id: NodeId): KcdNode[];
}

const slot = (pageId: string, parentId: string | null) => `${pageId}|${parentId ?? ""}`;

export function buildIndex(doc: KcdDocument): DocIndex {
  const groups = new Map<string, KcdNode[]>();
  for (const node of Object.values(doc.nodes)) {
    const key = slot(node.pageId, node.parentId);
    const list = groups.get(key);
    if (list) list.push(node);
    else groups.set(key, [node]);
  }
  for (const list of groups.values()) list.sort(compareOrder);
  const children = (pageId: PageId, parentId: NodeId | null) => groups.get(slot(pageId, parentId)) ?? [];
  return {
    children,
    subtree(id) {
      const root = doc.nodes[id];
      if (!root) return [];
      const out: KcdNode[] = [];
      const stack: KcdNode[] = [root];
      while (stack.length) {
        const node = stack.pop()!;
        out.push(node);
        const kids = children(node.pageId, node.id);
        for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
      }
      return out;
    },
  };
}

/** Ordered page roots. */
export function roots(doc: KcdDocument, pageId: PageId): KcdNode[] {
  return Object.values(doc.nodes)
    .filter((n) => n.pageId === pageId && n.parentId === null)
    .sort(compareOrder);
}

/** Ordered children of a node. */
export function children(doc: KcdDocument, parentId: NodeId): KcdNode[] {
  return Object.values(doc.nodes)
    .filter((n) => n.parentId === parentId)
    .sort(compareOrder);
}

/** Ancestor chain of `id`, nearest first. */
export function ancestors(doc: KcdDocument, id: NodeId): KcdNode[] {
  const out: KcdNode[] = [];
  const seen = new Set<string>([id]);
  let parentId = doc.nodes[id]?.parentId ?? null;
  while (parentId !== null && !seen.has(parentId)) {
    const parent = doc.nodes[parentId];
    if (!parent) break;
    out.push(parent);
    seen.add(parentId);
    parentId = parent.parentId;
  }
  return out;
}

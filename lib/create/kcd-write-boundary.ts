import {
  applyTransaction, validateRichText, resolveNode, legacySectionTypeOf, type ApplyResult, type KcdDocument,
  type KcdNode, type NodeId, type Op, type Transaction,
} from "@/lib/creative-core";
import {
  builderRegistry, liftStoredProps, repackStoredProps, sectionFieldsOf,
  type LegacySectionType,
} from "@/lib/create/kcd-adapter";
import { SECTION_FIELD_KEYS } from "@/lib/create/kcd-adapter/stored-props";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { containsUnsafeSiteContent } from "@/lib/create/site-seo";

export type PersistenceOp = Op & { normalizedProps?: Record<string, unknown> };
export type PreparedBuilderTransaction =
  | { ok: true; transaction: Omit<Transaction, "ops"> & { ops: PersistenceOp[] }; prediction: Extract<ApplyResult, { ok: true }> }
  | Extract<ApplyResult, { ok: false }>;

/** Adapter shadows remain in memory; foreign unknown data cannot silently enter storage. */
function withoutShadow<T extends { unknown?: Record<string, unknown> }>(node: T): T {
  const copy = structuredClone(node);
  if (copy.unknown) {
    delete copy.unknown.legacy;
    if (!Object.keys(copy.unknown).length) delete copy.unknown;
  }
  return copy;
}

export function normalizeBuilderNode(node: KcdNode): KcdNode {
  const type = legacySectionTypeOf(node.type);
  if (type === null) return node;
  const checked = sectionPropsForSave(type as LegacySectionType, repackStoredProps(sectionFieldsOf(node)));
  if (!checked.ok) throw new Error(checked.error);
  // _locked is a core field, added after the frozen 3B boundary; preserve it explicitly.
  const stored = { ...checked.props, ...(node.locked === undefined ? {} : { _locked: node.locked }) };
  const normalized = { ...node };
  for (const key of SECTION_FIELD_KEYS) delete (normalized as unknown as Record<string, unknown>)[key];
  return { ...normalized, ...liftStoredProps(stored).fields };
}

const contentOp = (op: Op): boolean => !["moveNode", "removeNode", "setDeviceComposition"].includes(op.op);

/**
 * Validate original intent, then apply the exact 3B normalization only to written legacy
 * content. The internal RPC metadata is never accepted from browser callers.
 */
export function prepareBuilderTransaction(doc: KcdDocument, input: Transaction): PreparedBuilderTransaction {
  const tx: Transaction = { ...input, ops: input.ops.map((op) => {
    if (op.op === "insertPage") return { ...op, page: withoutShadow(op.page) };
    if (op.op === "restorePage") return { ...op, page: withoutShadow(op.page), nodes: op.nodes.map(withoutShadow) };
    if (op.op === "insertNode") return { ...op, node: withoutShadow(op.node) };
    if (op.op === "insertSubtree" || op.op === "restoreSubtree") return { ...op, nodes: op.nodes.map(withoutShadow) } as Op;
    return op;
  }) };
  const applied = applyTransaction(doc, tx, builderRegistry, { isUnsafeContent: containsUnsafeSiteContent });
  if (!applied.ok) return applied;
  for (const node of Object.values(applied.document.nodes)) if (node.type === "text" && [node.props, ...Object.values(node.overrides)].some(props=>props?.runs!==undefined)) for (const device of ["desktop", "tablet", "mobile"] as const) {
    const props=resolveNode(node,device,builderRegistry.get(node.type)),error=validateRichText(props.text,props.runs,props.href);
    if(error)return {ok:false,error:{code:"KCD_INVALID",message:error}};
  }
  const nodes = { ...applied.document.nodes };
  const ops: PersistenceOp[] = tx.ops.map((op) => structuredClone(op));
  const lastWrite = new Map<NodeId, number>();
  ops.forEach((op, i) => {
    if (contentOp(op) && "id" in op) lastWrite.set(op.id, i);
  });
  try {
    ops.forEach((op) => {
      if (op.op === "insertNode") {
        if (!nodes[op.node.id]) return;
        const normalized = normalizeBuilderNode(nodes[op.node.id]);
        nodes[normalized.id] = normalized;
        Object.assign(op.node, sectionFieldsOf(normalized));
        for (const field of SECTION_FIELD_KEYS) if (!(field in normalized)) delete (op.node as unknown as Record<string, unknown>)[field];
      }
      if (op.op === "insertSubtree" || op.op === "restoreSubtree" || op.op === "restorePage") {
        for (const inserted of op.nodes) {
          if (!nodes[inserted.id]) continue;
          const normalized = normalizeBuilderNode(nodes[inserted.id]);
          nodes[normalized.id] = normalized;
          Object.assign(inserted, sectionFieldsOf(normalized));
          for (const field of SECTION_FIELD_KEYS) if (!(field in normalized)) delete (inserted as unknown as Record<string, unknown>)[field];
        }
      }
    });
    for (const [id, i] of lastWrite) {
      if (!nodes[id]) continue;
      const normalized = normalizeBuilderNode(nodes[id]);
      nodes[id] = normalized;
      if (legacySectionTypeOf(normalized.type) !== null) ops[i].normalizedProps = repackStoredProps(sectionFieldsOf(normalized));
    }
  } catch (error) {
    return { ok: false, error: { code: "KCD_INVALID", message: error instanceof Error ? error.message : "Invalid node content" } };
  }
  return { ok: true, transaction: { ...tx, ops }, prediction: { ...applied, document: { ...applied.document, nodes } } };
}

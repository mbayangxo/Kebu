import { z } from "zod";
import {
  TX_LIMITS, deviceCompositionSchema, isUuid, nodeA11ySchema, type KcdNode, type KcdPage,
  nodeVisibilitySchema, responsiveStateSchema, type NodeId, type Transaction,
} from "@/lib/creative-core";

const id = z.string().refine(isUuid, "Expected a canonical UUID");
const device = z.enum(["tablet", "mobile"]);
const bag = z.record(z.string(), z.unknown());
const value = z.unknown().refine((v) => v !== undefined, "value is required; use null to clear metadata");
const fields = {
  id, type: z.string(), typeVersion: z.number().int().positive(), props: bag,
  overrides: z.strictObject({ tablet: bag.optional(), mobile: bag.optional() }),
  responsiveState: responsiveStateSchema.optional(), visibility: nodeVisibilitySchema.optional(),
  a11y: nodeA11ySchema.optional(), motion: z.unknown().optional(),
  interaction: z.unknown().optional(), dataBinding: z.unknown().optional(),
  locked: z.boolean().optional(), unknown: bag.optional(),
};
const newNode = z.strictObject(fields);
const placed = newNode.extend({ pageId: id, parentId: id.nullable(), orderKey: z.string() });
const restored = placed.extend({ version: z.number().int().positive() });
export const kcdNodeResponseSchema = restored.transform((node) => node as KcdNode);
const pageFields = {
  id, slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(60),
  title: z.string().trim().min(1).max(120), orderKey: z.string(),
  deviceLayout: z.strictObject({ tablet: deviceCompositionSchema.optional(), mobile: deviceCompositionSchema.optional() }),
  unknown: bag.optional(),
};
const newPage = z.strictObject(pageFields);
export const kcdPageResponseSchema = newPage.extend({ layoutVersion: z.number().int().positive() }).transform((page) => page as KcdPage);
export const kcdAcknowledgementSchema = z.object({
  status: z.literal("committed"),
  versions: z.record(z.string(), z.number().int().positive()),
  removed: z.array(id).transform((ids) => ids as NodeId[]),
  nodes: z.array(kcdNodeResponseSchema),
  pages: z.array(kcdPageResponseSchema).optional(),
  removedPages: z.array(id).optional(),
});
export function parseKcdAcknowledgement(input: unknown, transaction: Transaction) {
  const acknowledgement = kcdAcknowledgementSchema.parse(input);
  const pages = new Set(transaction.ops.flatMap((op) => ["setDeviceComposition", "updatePage", "movePage", "removePage"].includes(op.op) && "pageId" in op ? [op.pageId as string] : op.op === "insertPage" || op.op === "restorePage" ? [op.page.id as string] : []));
  const lifecycle = transaction.ops.some((op) => ["insertPage", "updatePage", "movePage", "removePage", "restorePage"].includes(op.op));
  const canonicalPages = new Map((acknowledgement.pages ?? []).map((page) => [page.id as string, page]));
  if (canonicalPages.size !== (acknowledgement.pages ?? []).length
      || (acknowledgement.pages ?? []).some((page) => acknowledgement.versions[page.id] !== page.layoutVersion)
      || new Set(acknowledgement.removedPages ?? []).size !== (acknowledgement.removedPages ?? []).length
      || (acknowledgement.removedPages ?? []).some((id) => id in acknowledgement.versions || canonicalPages.has(id))
      || (lifecycle && (!acknowledgement.pages || !acknowledgement.removedPages || Object.keys(acknowledgement.versions).some((id) => pages.has(id) && canonicalPages.get(id)?.layoutVersion !== acknowledgement.versions[id])))) throw new Error("Incomplete page save acknowledgement.");
  const nodes = new Map(acknowledgement.nodes.map((node) => [node.id as string, node]));
  if (nodes.size !== acknowledgement.nodes.length || new Set(acknowledgement.removed).size !== acknowledgement.removed.length
      || acknowledgement.nodes.some((node) => acknowledgement.versions[node.id] !== node.version)
      || Object.entries(acknowledgement.versions).some(([id, version]) => !pages.has(id) && nodes.get(id)?.version !== version)) {
    throw new Error("Incomplete save acknowledgement. Retry with the same transaction.");
  }
  return acknowledgement;
}
const nodeValue = (op: string) => z.strictObject({ op: z.literal(op), id, value });

export const builderTransactionSchema = z.strictObject({
  txId: id, origin: z.enum(["user", "ai", "system", "migration"]),
  label: z.string().max(TX_LIMITS.maxLabelLength),
  expect: z.record(id, z.number().int().positive()),
  ops: z.array(z.discriminatedUnion("op", [
    z.strictObject({ op: z.literal("insertPage"), page: newPage }),
    z.strictObject({ op: z.literal("updatePage"), pageId: id, title: pageFields.title.optional(), slug: pageFields.slug.optional() }),
    z.strictObject({ op: z.literal("movePage"), pageId: id, orderKey: z.string() }),
    z.strictObject({ op: z.literal("removePage"), pageId: id }),
    z.strictObject({ op: z.literal("restorePage"), page: kcdPageResponseSchema, nodes: z.array(restored) }),
    z.strictObject({ op: z.literal("insertNode"), node: newNode, parentId: id.nullable(), pageId: id, orderKey: z.string() }),
    z.strictObject({ op: z.literal("insertSubtree"), nodes: z.array(placed).min(1).max(TX_LIMITS.maxOps) }),
    z.strictObject({ op: z.literal("restoreSubtree"), nodes: z.array(restored).min(1).max(TX_LIMITS.maxOps) }),
    z.strictObject({ op: z.literal("removeNode"), id }),
    z.strictObject({ op: z.literal("moveNode"), id, parentId: id.nullable(), orderKey: z.string() }),
    z.strictObject({ op: z.literal("setProp"), id, path: z.string(), value }),
    z.strictObject({ op: z.literal("unsetProp"), id, path: z.string() }),
    z.strictObject({ op: z.literal("setOverride"), id, device, key: z.string(), value }),
    z.strictObject({ op: z.literal("clearOverride"), id, device, key: z.string().optional() }),
    z.strictObject({ op: z.literal("setDeviceComposition"), pageId: id, device, composition: deviceCompositionSchema.nullable() }),
    nodeValue("setA11y"), nodeValue("setVisibility"), nodeValue("setLocked"), nodeValue("setResponsiveState"), nodeValue("setMotion"), nodeValue("setInteraction"),
  ])).min(1).max(TX_LIMITS.maxOps),
}).transform((value) => value as Transaction);

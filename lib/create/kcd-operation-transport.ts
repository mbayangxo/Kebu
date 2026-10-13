import { z } from "zod";
import { type Transaction } from "@/lib/creative-core";
import type { OperationAcknowledgement } from "@/lib/create/kcd-operation-coordinator";
import { kcdAcknowledgementSchema as ackSchema, parseKcdAcknowledgement } from "@/lib/create/kcd-transaction-schema";
import { enqueueSaveOperations, listOfflineQueue, removeOfflineQueueItem } from "@/lib/create/offline-queue";

const errorSchema = z.object({
  error: z.string(),
  conflicts: z.array(z.object({ id: z.string(), expected: z.number().nullable(), actual: z.number() })).optional(),
});

/** Persist uncertain writes as immutable transactions before surfacing the network failure. */
export async function sendKcdTransaction(projectId: string, transaction: Transaction): Promise<OperationAcknowledgement> {
  let response: Response;
  try {
    response = await fetch(`/api/projects/${projectId}/operations`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    if (response.status >= 500) throw new Error("Save acknowledgement unavailable");
  } catch (error) {
    enqueueSaveOperations({ projectId, transaction });
    throw error;
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    const message = parsed.success ? parsed.data.error : "Changes were not saved.";
    return { ok: false, error: response.status === 409
      ? { code: "KCD_CONFLICT", message, conflicts: parsed.success ? parsed.data.conflicts ?? [] : [] }
      : { code: "KCD_INVALID", message } };
  }
  let ack: z.infer<typeof ackSchema>;
  try { ack = parseKcdAcknowledgement(await response.json(), transaction); }
  catch {
    // A success status with a truncated/malformed body is still an uncertain acknowledgement.
    enqueueSaveOperations({ projectId, transaction });
    throw new Error("Save acknowledgement is incomplete. Click Save draft to retry.");
  }
  for (const item of listOfflineQueue()) {
    if (item.kind === "save_operations" && item.payload.projectId === projectId && item.payload.transaction.txId === transaction.txId) removeOfflineQueueItem(item.id);
  }
  return { ok: true, versions: ack.versions, removed: ack.removed, nodes: ack.nodes, ...(ack.pages ? { pages: ack.pages } : {}), ...(ack.removedPages ? { removedPages: ack.removedPages as import("@/lib/creative-core").PageId[] } : {}) };
}

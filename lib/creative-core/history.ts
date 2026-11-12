import { canonicalStringify } from "./document";
import type { KcdDocument, NodeId } from "./model";
import { expectFor, type ApplyResult, type Op, type Transaction } from "./ops";

type Committed = Extract<ApplyResult, { ok: true }>;
export interface HistoryEntry {
  txId: string;
  label: string;
  origin: Transaction["origin"];
  forward: Op[];
  inverse: Op[];
  affected: string[];
  at: number;
  expected: Record<string, number | null>;
}
export type HistoryPreparation =
  | { ok: true; transaction: Transaction }
  | { ok: false; reason: "empty" | "changed-elsewhere"; ids: string[] };

function version(doc: KcdDocument, id: string): number | null {
  return doc.nodes[id as NodeId]?.version ?? doc.pages.find((p) => p.id === id)?.layoutVersion ?? null;
}
function propertySlot(ops: Op[]): string | null {
  if (ops.length < 1 || ops.length > 2) return null;
  const op = ops[0];
  if (ops.length === 2 && (ops[1].op !== "setResponsiveState" || !("id" in op) || ops[1].id !== op.id)) return null;
  if (op.op === "setProp") return `${op.op}:${op.id}:${op.path}`;
  if (op.op === "setOverride") return `${op.op}:${op.id}:${op.device}:${op.key}`;
  return null;
}

/** Session history records confirmed operations; failed submissions never move either stack. */
export class OperationHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private coalesce = true;
  constructor(private readonly maxEntries = 200, private readonly maxBytes = 5 * 1024 * 1024) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isSafeInteger(maxBytes) || maxBytes < 2) {
      throw new Error("History limits must be positive integers (at least two bytes)");
    }
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get size() { return this.past.length; }

  private advance(before: KcdDocument, result: Committed) {
    const ids = [...Object.keys(result.versions), ...result.removed, ...(result.removedPages ?? [])];
    for (const entry of [...this.past, ...this.future]) {
      for (const id of ids) {
        if (Object.hasOwn(entry.expected, id) && entry.expected[id] === version(before, id)) {
          entry.expected[id] = version(result.document, id);
        }
      }
    }
  }

  record(before: KcdDocument, tx: Transaction, result: Committed, at: number) {
    if (!result.inverse.length) return;
    this.advance(before, result);
    const affected = [...new Set([...Object.keys(result.versions), ...result.removed, ...(result.removedPages ?? [])])];
    const entry: HistoryEntry = {
      txId: tx.txId, label: tx.label, origin: tx.origin,
      forward: structuredClone(tx.ops), inverse: structuredClone(result.inverse), affected, at,
      expected: Object.fromEntries(affected.map((id) => [id, version(result.document, id)])),
    };
    const previous = this.past.at(-1);
    const slot = propertySlot(entry.forward);
    if (this.coalesce && !this.future.length && previous && slot && slot === propertySlot(previous.forward) && entry.origin === previous.origin && at >= previous.at && at - previous.at <= 750
        && previous.affected.length === affected.length && previous.affected.every((id) => affected.includes(id))
        && previous.affected.every((id) => previous.expected[id] === version(result.document, id))) {
      previous.forward = entry.forward;
      previous.txId = entry.txId;
      previous.at = at;
      previous.expected = entry.expected;
    } else this.past.push(entry);
    this.future = [];
    this.coalesce = true;
    while (this.past.length > this.maxEntries || canonicalStringify(this.past).length > this.maxBytes) this.past.shift();
  }

  prepare(direction: "undo" | "redo", doc: KcdDocument, txId: string): HistoryPreparation {
    const entry = (direction === "undo" ? this.past : this.future).at(-1);
    if (!entry) return { ok: false, reason: "empty", ids: [] };
    const ids = entry.affected.filter((id) => version(doc, id) !== entry.expected[id]);
    if (ids.length) return { ok: false, reason: "changed-elsewhere", ids };
    const ops = structuredClone(direction === "undo" ? entry.inverse : entry.forward);
    return { ok: true, transaction: { txId, origin: "user", label: `${direction === "undo" ? "Undo" : "Redo"}: ${entry.label}`.slice(0, 120), ops, expect: expectFor(doc, ops) } };
  }

  confirm(direction: "undo" | "redo", before: KcdDocument, result: Committed) {
    const source = direction === "undo" ? this.past : this.future;
    const destination = direction === "undo" ? this.future : this.past;
    const entry = source.at(-1);
    if (!entry) throw new Error("No history entry to confirm");
    this.advance(before, result);
    source.pop();
    // Inverting Undo creates redo operations that carry the current tombstone versions.
    if (direction === "undo") entry.forward = structuredClone(result.inverse);
    else entry.inverse = structuredClone(result.inverse);
    entry.expected = Object.fromEntries(entry.affected.map((id) => [id, version(result.document, id)]));
    destination.push(entry);
    this.coalesce = false;
  }
}

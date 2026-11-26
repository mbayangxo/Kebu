import {
  OperationHistory, TX_LIMITS, expectFor, type ApplyResult, type KcdDocument, type KcdNode, type KcdPage, type PageId,
  type NodeId, type Op, type Transaction, type TxError,
} from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";

export type OperationAcknowledgement =
  | { ok: true; versions: Record<string, number>; removed: NodeId[]; nodes: KcdNode[]; pages?: KcdPage[]; removedPages?: PageId[] }
  | { ok: false; error: TxError };
export type OperationState = "idle" | "saving" | "queued" | "rejected" | "conflicted";
type Pending = {
  label: string; ops: Op[]; at: number; tx?: Transaction;
  mode?: "undo" | "redo";
  waiters: { resolve: () => void; reject: (error: Error) => void }[];
};

function slot(ops: Op[]): NodeId | null {
  if (!ops.length || !ops.every((op) => "id" in op && ["setProp", "unsetProp", "setOverride", "clearOverride", "setResponsiveState", "setA11y", "setVisibility", "setLocked", "setMotion", "setInteraction"].includes(op.op))) return null;
  const id = (ops[0] as { id: NodeId }).id;
  return ops.every((op) => "id" in op && op.id === id) ? id : null;
}
function property(ops: Op[]): string | null {
  if (ops.length < 1 || ops.length > 2) return null;
  const op = ops[0];
  if (ops.length === 2 && (ops[1].op !== "setResponsiveState" || !("id" in op) || ops[1].id !== op.id)) return null;
  if (op.op === "setProp") return `${op.id}:base:${op.path}`;
  if (op.op === "setOverride") return `${op.id}:${op.device}:${op.key}`;
  return null;
}

/**
 * Single active editor: queued node edits coalesce; structure/history are barriers.
 * Expectations are taken from confirmed state at dispatch. An uncertain acknowledgement
 * retains the exact transaction (including txId) for retry, never a fresh write.
 */
export class OperationCoordinator {
  readonly history = new OperationHistory();
  private confirmed: KcdDocument;
  private view: KcdDocument;
  private pending: Pending[] = [];
  private running: Promise<void> | null = null;
  private state: OperationState = "idle";
  private error: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    document: KcdDocument,
    private readonly send: (tx: Transaction) => Promise<OperationAcknowledgement>,
    private readonly txId: () => string = () => crypto.randomUUID(),
    private readonly changed: () => void = () => undefined,
    private readonly autosaveDelayMs = 0,
  ) { this.confirmed = document; this.view = document; }

  get document() { return this.view; }
  get confirmedDocument() { return this.confirmed; }
  get status() { return this.state; }
  get message() { return this.error; }
  get canPublish() { return !this.pending.length && this.state === "idle"; }

  /** Preserve the exact immutable reviewed transaction and retry identity. */
  submitReviewed(transaction: Transaction, at = Date.now()): Promise<void> {
    if (!this.canPublish) return Promise.reject(new Error("Finish saving before applying a reviewed plan."));
    if (transaction.origin !== "ai") return Promise.reject(new Error("Expected a reviewed AI transaction."));
    const checked = prepareBuilderTransaction(this.confirmed, transaction);
    if (!checked.ok) return Promise.reject(new Error(checked.error.message));
    this.view = checked.prediction.document;
    const promise = new Promise<void>((resolve, reject) => this.pending.push({ label: transaction.label, ops: structuredClone(transaction.ops), tx: structuredClone(transaction), at, waiters: [{ resolve, reject }] }));
    this.changed(); void this.flush(); return promise;
  }

  submit(label: string, ops: Op[], at = Date.now()): Promise<void> {
    if (this.state === "conflicted" || this.state === "rejected") return Promise.reject(new Error(this.error ?? "Reload to continue"));
    if (this.pending.length >= 200) return Promise.reject(new Error("Too many pending changes. Reconnect and save before editing more."));
    const probe = prepareBuilderTransaction(this.view, { txId: this.txId(), origin: "user", label, ops, expect: expectFor(this.view, ops) });
    if (!probe.ok) return Promise.reject(new Error(probe.error.message));
    this.view = probe.prediction.document;
    const promise = new Promise<void>((resolve, reject) => {
      const last = this.pending.at(-1);
      if (last && !last.tx && !last.mode && at >= last.at && at - last.at <= 750 && slot(ops) && slot(last.ops) === slot(ops) && last.ops.length + ops.length <= TX_LIMITS.maxOps) {
        // Preserve operation order (including parent/child property paths); never replace a
        // queued snapshot with stale whole-node props. Structural transactions stop coalescing.
        if (property(ops) && property(ops) === property(last.ops) && ops.length === last.ops.length) last.ops = structuredClone(ops);
        else last.ops.push(...structuredClone(ops));
        last.at = at;
        last.waiters.push({ resolve, reject });
      } else this.pending.push({ label, ops: structuredClone(ops), at, waiters: [{ resolve, reject }] });
    });
    this.changed();
    if (slot(ops) && this.autosaveDelayMs > 0 && !this.running) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.autosaveDelayMs);
    } else void this.flush();
    return promise;
  }

  flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.running) return this.running;
    if (this.state === "conflicted" || this.state === "rejected") return Promise.resolve();
    // Schedule once so synchronous edits can coalesce before materializing a transaction.
    this.running = Promise.resolve().then(() => this.drain()).finally(() => {
      this.running = null;
      if (this.pending.length && this.state === "idle") void this.flush();
    });
    return this.running;
  }

  private block(state: "rejected" | "conflicted", message: string) {
    this.state = state;
    this.error = message;
    if (state === "rejected") this.view = this.confirmed;
    const error = new Error(message);
    for (const item of this.pending) for (const waiter of item.waiters) waiter.reject(error);
    this.pending = [];
    this.changed();
  }

  private async drain() {
    while (this.pending.length) {
      const item = this.pending[0];
      item.tx ??= { txId: this.txId(), origin: "user", label: item.label, ops: item.ops, expect: expectFor(this.confirmed, item.ops) };
      const prepared = prepareBuilderTransaction(this.confirmed, item.tx);
      if (!prepared.ok) { this.block(prepared.error.code === "KCD_CONFLICT" ? "conflicted" : "rejected", prepared.error.message); return; }
      this.state = "saving"; this.error = null; this.changed();
      let ack: OperationAcknowledgement;
      try { ack = await this.send(item.tx); }
      catch (error) {
        this.state = "queued"; this.error = error instanceof Error ? error.message : "Save not confirmed. Retry when connected.";
        this.changed(); return;
      }
      if (!ack.ok) { this.block(ack.error.code === "KCD_CONFLICT" ? "conflicted" : "rejected", ack.error.message); return; }
      const prediction = prepared.prediction;
      const lifecycle = item.tx.ops.some((op) => ["insertPage", "updatePage", "movePage", "removePage", "restorePage"].includes(op.op));
      if (lifecycle && (!ack.pages || !ack.removedPages || (prediction.removedPages ?? []).join() !== [...ack.removedPages].sort().join())) { this.block("conflicted", "Page save acknowledgement is incomplete — retry or reload"); return; }
      const acknowledgedPages = new Map((ack.pages ?? []).map((page) => [page.id, page]));
      if ((ack.pages ?? []).some((page) => ack.versions[page.id] !== page.layoutVersion || prediction.versions[page.id] !== page.layoutVersion)) { this.block("conflicted", "Saved page versions differ — reload to continue"); return; }
      if (lifecycle && (acknowledgedPages.size !== ack.pages!.length || prediction.document.pages.some((page) => prediction.versions[page.id] && acknowledgedPages.get(page.id)?.layoutVersion !== prediction.versions[page.id]))) { this.block("conflicted", "Saved page versions differ — reload to continue"); return; }
      const nodes = { ...prediction.document.nodes };
      for (const node of ack.nodes) {
        if (ack.versions[node.id] !== node.version || prediction.versions[node.id] !== node.version) {
          this.block("conflicted", "Changed elsewhere after saving — reload to continue"); return;
        }
        nodes[node.id] = node;
      }
      const acknowledgedNodes = new Set(ack.nodes.map((node) => node.id));
      if (acknowledgedNodes.size !== ack.nodes.length
          || Object.keys(prediction.versions).some((id) => prediction.document.nodes[id as NodeId] && !acknowledgedNodes.has(id as NodeId))
          || Object.keys(prediction.versions).some((id) => ack.versions[id] !== prediction.versions[id])
          || prediction.removed.join() !== [...ack.removed].sort().join()) {
        this.block("conflicted", "Saved versions differ — reload to continue"); return;
      }
      const result: Extract<ApplyResult, { ok: true }> = { ...prediction, document: { ...prediction.document, nodes, pages: prediction.document.pages.map((page) => acknowledgedPages.get(page.id) ?? page) } };
      if (item.mode) this.history.confirm(item.mode, this.confirmed, result);
      else this.history.record(this.confirmed, item.tx, result, item.at);
      this.confirmed = result.document;
      this.pending.shift();
      for (const waiter of item.waiters) waiter.resolve();
      // Rebase unsent user intents on the canonical acknowledgement, preserving later edits.
      let view = this.confirmed;
      for (const next of this.pending) {
        const replay = prepareBuilderTransaction(view, { txId: this.txId(), origin: "user", label: next.label, ops: next.ops, expect: expectFor(view, next.ops) });
        if (!replay.ok) { this.block("rejected", replay.error.message); return; }
        view = replay.prediction.document;
      }
      this.view = view;
      this.changed();
    }
    this.state = "idle"; this.error = null; this.changed();
  }

  /** Freeze every remaining intent into an ordered immutable transaction before leaving/offline. */
  checkpointPending(persist: (transaction: Transaction) => void) {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    let doc = this.confirmed;
    for (const item of this.pending) {
      item.tx ??= { txId: this.txId(), origin: "user", label: item.label, ops: item.ops, expect: expectFor(doc, item.ops) };
      const prepared = prepareBuilderTransaction(doc, item.tx);
      if (!prepared.ok) throw new Error(prepared.error.message);
      persist(item.tx);
      doc = prepared.prediction.document;
    }
  }

  async travel(direction: "undo" | "redo", at = Date.now()) {
    await this.flush();
    if (!this.canPublish) throw new Error(this.error ?? "Finish saving before Undo/Redo");
    const preparation = this.history.prepare(direction, this.confirmed, this.txId());
    if (!preparation.ok) throw new Error(preparation.reason === "empty" ? "No history" : "Cannot undo: changed elsewhere");
    const prediction = prepareBuilderTransaction(this.confirmed, preparation.transaction);
    if (!prediction.ok) throw new Error(prediction.error.message);
    this.view = prediction.prediction.document;
    const promise = new Promise<void>((resolve, reject) => this.pending.push({
      label: preparation.transaction.label, ops: preparation.transaction.ops,
      at, tx: preparation.transaction, mode: direction, waiters: [{ resolve, reject }],
    }));
    this.changed(); void this.flush();
    return promise;
  }
}

/** Durable save facts, read at action time rather than from a stale React render. */
export type BuilderSaveReadiness = { ok: true } | { ok: false; reason: string };

type QueuedProjectWrite = {
  status: string;
  payload: object;
};

export function builderProjectWrites<T extends QueuedProjectWrite>(projectId: string, items: readonly T[]): T[] {
  return items.filter(item => "projectId" in item.payload && item.payload.projectId === projectId);
}

export function builderSaveReadiness(input: {
  projectId: string;
  pending: ReadonlySet<string>;
  terminalCount: number;
  historyRejection: string | null;
  queue: readonly QueuedProjectWrite[];
}): BuilderSaveReadiness {
  const queue = builderProjectWrites(input.projectId, input.queue);
  const terminals = queue.filter(item => item.status === "terminal").length;
  if (input.terminalCount > 0 || terminals > 0) {
    return { ok: false, reason: "Some changes need attention. Review Offline changes before continuing." };
  }
  if (input.historyRejection && input.pending.has("history")) {
    return { ok: false, reason: `${input.historyRejection} Undo/Redo again or edit the section, then click Save draft.` };
  }
  if (input.pending.size > 0) {
    return { ok: false, reason: "Some changes are not confirmed saved. Click Save draft to retry before continuing." };
  }
  if (queue.length > 0) {
    return { ok: false, reason: "Changes are still queued. Reconnect and sync Offline changes before continuing." };
  }
  return { ok: true };
}

/** One draft-dependent action at a time; a resolved save promise is not a save receipt. */
export class BuilderDraftActionGate {
  private running = false;
  get busy() { return this.running; }

  async run<T>(options: {
    save: () => Promise<void>;
    readiness: () => BuilderSaveReadiness;
    action: () => Promise<T>;
  }): Promise<{ status: "busy" } | { status: "blocked"; reason: string } | { status: "completed"; value: T }> {
    if (this.running) return { status: "busy" };
    this.running = true;
    try {
      await options.save();
      const ready = options.readiness();
      if (!ready.ok) return { status: "blocked", reason: ready.reason };
      return { status: "completed", value: await options.action() };
    } finally {
      // Includes save failures before any request, request failures and reload failures.
      this.running = false;
    }
  }
}

/**
 * Orders every Builder write of section props — autosave / "Save draft" (PATCH /sections, one
 * section) and Undo/Redo (POST /sections/batch, a full snapshot) — so a newer edit can never be
 * overwritten by an older write.
 *
 * Why: every PATCH carries the section's full props and the server stores whatever arrives last.
 * Without ordering, an autosave that was sent first but finished last (e.g. an image upload's save
 * racing a "Save draft" that also carried a new overlay) rewrote the older props on the server, and
 * its response replaced the Builder's local props — the newer edit vanished while the UI said
 * "Draft saved". Two Undo clicks likewise sent two unordered batch writes.
 *
 * Model:
 *   - Per section, at most one save is in flight; saves requested meanwhile coalesce to the newest
 *     props, sent when the in-flight one completes. Re-requesting the props already in flight is a
 *     no-op (Save draft right after the autosave sent them).
 *   - Every local edit bumps the section's version; a save records the version it was sent for, and
 *     `isCurrent(id, version)` tells the caller whether a response still describes the latest edit
 *     (only then may it replace local props, mark the section saved, or report a failure).
 *   - `writeHistory(task)` is a barrier: at call time it drops queued saves and makes in-flight
 *     responses stale (the snapshot replaces those edits); the task runs after in-flight saves and
 *     any earlier history write have finished; saves requested meanwhile (edits made after the Undo)
 *     wait and are sent after it. When history writes pile up, only the newest snapshot is written.
 *   - `exclusive(task, retire)` orders a structural write (Add, Remove) the same way, without
 *     dropping other sections' saves: it runs after in-flight saves and earlier chained writes, and
 *     saves requested meanwhile are sent after it. Sections in `retire` (the one being removed) have
 *     their queued save dropped and in-flight responses made stale first.
 *   - `idle()` resolves once every chained write and save requested so far has finished (Publish).
 */
export type SendSectionSave = (sectionId: string, props: Record<string, unknown>, version: number) => Promise<void>;

type Slot = {
  version: number;
  inFlight: Promise<void> | null;
  /** Props of the request in flight (reference identity is enough: callers pass stored objects). */
  sending: Record<string, unknown> | null;
  queued: Record<string, unknown> | null;
};

export class SectionSaveCoordinator {
  private readonly slots = new Map<string, Slot>();
  /** The active history write chain, if any. */
  private history: Promise<void> | null = null;
  private historyTicket = 0;

  constructor(private readonly send: SendSectionSave) {}

  private slot(sectionId: string): Slot {
    let s = this.slots.get(sectionId);
    if (!s) {
      s = { version: 0, inFlight: null, sending: null, queued: null };
      this.slots.set(sectionId, s);
    }
    return s;
  }

  /** Record a local edit to a section; returns its new version. */
  noteLocalEdit(sectionId: string): number {
    return ++this.slot(sectionId).version;
  }

  /** Whether a response for `version` still describes the section's latest local edit. */
  isCurrent(sectionId: string, version: number): boolean {
    return this.slot(sectionId).version === version;
  }

  /**
   * Save the section's full props. If a save for it is in flight (or a history write is pending),
   * these props replace any queued ones and are sent afterwards. Resolves when these props (or newer
   * ones that replaced them) have been sent and answered, or were superseded by a history write.
   */
  save(sectionId: string, props: Record<string, unknown>): Promise<void> {
    const s = this.slot(sectionId);
    if (s.inFlight || this.history) {
      const alreadySending = s.inFlight !== null && s.queued === null && props === s.sending;
      if (!alreadySending) s.queued = props;
    } else {
      s.inFlight = this.run(sectionId, props);
    }
    return this.drain(sectionId);
  }

  private async run(sectionId: string, props: Record<string, unknown>): Promise<void> {
    const s = this.slot(sectionId);
    s.sending = props;
    try {
      await this.send(sectionId, props, s.version);
    } finally {
      s.sending = null;
      // While a history write is pending, queued props wait for it (it starts them when done).
      const next = this.history ? null : s.queued;
      if (next) s.queued = null;
      s.inFlight = next ? this.run(sectionId, next) : null;
    }
  }

  /** Resolves when the section has nothing in flight and nothing queued. */
  private async drain(sectionId: string): Promise<void> {
    const s = this.slot(sectionId);
    for (;;) {
      const waitFor = s.inFlight ?? (s.queued ? this.history : null);
      if (!waitFor) return;
      await waitFor.catch(() => undefined);
    }
  }

  /** Resolves once no section has a save in flight (queued saves are not started here). */
  private async settleInFlight(): Promise<void> {
    for (;;) {
      const inFlight = [...this.slots.values()].map((s) => s.inFlight).filter((p): p is Promise<void> => p !== null);
      if (inFlight.length === 0) return;
      await Promise.all(inFlight.map((p) => p.catch(() => undefined)));
    }
  }

  /** Runs `task` after in-flight saves and every earlier chained write; see the model above. */
  private chain(task: () => Promise<void>, shouldRun: () => boolean = () => true): Promise<void> {
    const previous = this.history;
    const run = (async () => {
      if (previous) await previous;
      await this.settleInFlight();
      if (shouldRun()) await task();
    })();
    const tracked: Promise<void> = run
      .catch(() => undefined)
      .then(() => {
        if (this.history !== tracked) return;
        this.history = null;
        for (const [sectionId, s] of this.slots) {
          if (s.queued && !s.inFlight) {
            const props = s.queued;
            s.queued = null;
            s.inFlight = this.run(sectionId, props);
          }
        }
      });
    this.history = tracked;
    return run;
  }

  /**
   * Write a history snapshot (Undo/Redo) as the next write for every section — see the model above.
   * Resolves when the snapshot was written, or skipped because a newer history write replaced it.
   */
  writeHistory(task: () => Promise<void>): Promise<void> {
    for (const s of this.slots.values()) {
      s.queued = null;
      s.version++;
    }
    const ticket = ++this.historyTicket;
    return this.chain(task, () => ticket === this.historyTicket);
  }

  /** A structural write (Add, Remove), ordered with every other write — see the model above. */
  exclusive(task: () => Promise<void>, retire: readonly string[] = []): Promise<void> {
    for (const id of retire) {
      const s = this.slot(id);
      s.queued = null;
      s.version++;
    }
    return this.chain(task);
  }

  /** Resolves once every chained write and every save requested so far has finished. */
  async idle(): Promise<void> {
    for (;;) {
      if (this.history) {
        await this.history;
        continue;
      }
      // Queued saves only wait while a chained write runs (handled above); in-flight ones settle here.
      if (![...this.slots.values()].some((s) => s.inFlight)) return;
      await this.settleInFlight();
    }
  }
}

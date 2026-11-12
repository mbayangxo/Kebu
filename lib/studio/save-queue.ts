/** Serializes local-draft writes and conditional server mutations for one editor. */
export class StudioSaveQueue {
  constructor(readonly resourceId = "") {}

  private tail: Promise<unknown> = Promise.resolve();
  private epoch = 0;
  private revision: string | null = null;
  private blocked = false;

  reset(revision: string | null) {
    this.epoch++;
    this.revision = revision;
    this.blocked = false;
  }

  cancel() { this.epoch++; }
  pause() { this.blocked = true; }
  isBlocked() { return this.blocked; }
  getRevision() { return this.revision; }
  current() { const epoch = this.epoch; return () => epoch === this.epoch; }

  run(task: (context: StudioSaveContext) => Promise<void>): Promise<void> {
    const epoch = this.epoch;
    const active = () => epoch === this.epoch;
    const context: StudioSaveContext = {
      active,
      revision: () => this.revision,
      blocked: () => this.blocked,
      conflict: () => { if (active()) this.blocked = true; },
      acknowledge: revision => {
        if (!active()) return;
        this.revision = revision;
        this.blocked = false;
      },
    };
    const result = this.tail.then(async () => { if (active()) await task(context); });
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export type StudioSaveContext = {
  active: () => boolean;
  revision: () => string | null;
  blocked: () => boolean;
  conflict: () => void;
  acknowledge: (revision: string) => void;
};

export function validStudioSaveReceipt(raw: unknown, id: string): raw is { id: string; updated_at: string } {
  if (!raw || typeof raw !== "object") return false;
  const row = raw as Record<string, unknown>;
  return row.id === id && typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at));
}

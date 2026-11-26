import { describe, expect, it, vi } from "vitest";
import { BuilderDraftActionGate, builderProjectWrites, builderSaveReadiness } from "@/lib/create/builder-save-readiness";

const projectId = "qa-project";
const ready = (patch: Partial<Parameters<typeof builderSaveReadiness>[0]> = {}) => builderSaveReadiness({ projectId, pending: new Set(), terminalCount: 0, historyRejection: null, queue: [], ...patch });
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("Builder confirmed-save boundary", () => {
  it("project recovery selects only its own items for display and dismissal", () => {
    const items = [
      { id: "mine", status: "terminal", payload: { projectId } },
      { id: "other", status: "terminal", payload: { projectId: "other" } },
      { id: "checkout", status: "terminal", payload: { subdomain: "shop" } },
    ];
    expect(builderProjectWrites(projectId, items).map(item => item.id)).toEqual(["mine"]);
    expect(items).toHaveLength(3);
  });
  it.each(["section:hero", "chrome:header", "history"])("%s pending save blocks a draft-dependent action even when the flush resolves", async key => {
    const gate = new BuilderDraftActionGate();
    const action = vi.fn(async () => "sent");
    const result = await gate.run({ save: async () => {}, readiness: () => ready({ pending: new Set([key]) }), action });
    expect(result.status).toBe("blocked");
    expect(action).not.toHaveBeenCalled();
    expect(gate.busy).toBe(false);
  });
  it.each(["queued", "failed", "syncing", "terminal"])("%s durable project writes cannot be bypassed with an empty pending set", status => {
    expect(ready({ queue: [{ status, payload: { projectId } }] }).ok).toBe(false);
  });
  it("terminal items awaiting user acknowledgement still block when the queue was already removed", () => {
    expect(ready({ terminalCount: 1 }).ok).toBe(false);
  });
  it("uses current pending facts after an awaited save, rather than the pre-save render", async () => {
    const pending = new Set(["section:hero"]);
    const gate = new BuilderDraftActionGate();
    const action = vi.fn(async () => "receipt");
    const result = await gate.run({ save: async () => { pending.clear(); }, readiness: () => ready({ pending }), action });
    expect(result).toEqual({ status: "completed", value: "receipt" });
    expect(action).toHaveBeenCalledOnce();
  });
  it("does not block a saved project on another project's queue or a non-builder mutation", () => {
    expect(ready({ queue: [{ status: "terminal", payload: { projectId: "other" } }, { status: "queued", payload: { subdomain: "shop" } }] }).ok).toBe(true);
  });
  it("keeps a rejected history step's recovery reason until that step is actually saved", () => {
    expect(ready({ pending: new Set(["history"]), historyRejection: "Heading was rejected." })).toMatchObject({ ok: false, reason: expect.stringContaining("Heading was rejected") });
    expect(ready({ historyRejection: "Old rejected step" }).ok).toBe(true);
  });
  it("a thrown flush never calls the action and releases the gate for retry", async () => {
    const gate = new BuilderDraftActionGate();
    const action = vi.fn(async () => "sent");
    await expect(gate.run({ save: async () => { throw new Error("Save transport failed"); }, readiness: () => ready(), action })).rejects.toThrow("Save transport failed");
    expect(action).not.toHaveBeenCalled();
    expect(gate.busy).toBe(false);
    expect((await gate.run({ save: async () => {}, readiness: () => ready(), action })).status).toBe("completed");
  });
  it("same-tick duplicate and cross-action calls cannot issue another request during a save", async () => {
    const gate = new BuilderDraftActionGate();
    const flush = deferred();
    const action = vi.fn(async () => "sent");
    const first = gate.run({ save: () => flush.promise, readiness: () => ready(), action });
    expect(gate.busy).toBe(true);
    expect(await gate.run({ save: vi.fn(), readiness: () => ready(), action })).toEqual({ status: "busy" });
    expect(action).not.toHaveBeenCalled();
    flush.resolve();
    await first;
    expect(action).toHaveBeenCalledOnce();
  });
  it("holds the gate until the request and refresh settle; releases after rejection", async () => {
    const gate = new BuilderDraftActionGate();
    const request = deferred();
    const first = gate.run({ save: async () => {}, readiness: () => ready(), action: () => request.promise });
    await Promise.resolve();
    expect(await gate.run({ save: async () => {}, readiness: () => ready(), action: async () => {} })).toEqual({ status: "busy" });
    request.reject(new Error("Reload failed"));
    await expect(first).rejects.toThrow("Reload failed");
    expect(gate.busy).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { StudioSaveQueue, validStudioSaveReceipt } from "@/lib/studio/save-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

describe("Studio serialized draft saves", () => {
  it("waits for the first acknowledgement before using its revision for the next save", async () => {
    const queue = new StudioSaveQueue(); queue.reset("r1");
    const gate = deferred(); const requests: (string | null)[] = [];
    const first = queue.run(async c => { requests.push(c.revision()); await gate.promise; c.acknowledge("r2"); });
    const second = queue.run(async c => { requests.push(c.revision()); c.acknowledge("r3"); });
    await Promise.resolve(); expect(requests).toEqual(["r1"]);
    gate.resolve(); await Promise.all([first, second]); expect(requests).toEqual(["r1", "r2"]);
  });

  it("preserves the newest dirty draft when an older save finishes", async () => {
    const queue = new StudioSaveQueue(); queue.reset("r1");
    let latest = "A"; const gate = deferred(); const writes: unknown[] = [];
    const save = (snapshot: string) => queue.run(async c => {
      writes.push({ draft: latest, dirty: true, revision: c.revision() });
      if (snapshot === "A") await gate.promise;
      c.acknowledge(snapshot === "A" ? "r2" : "r3");
      writes.push({ draft: latest, dirty: latest !== snapshot, revision: c.revision() });
    });
    const first = save("A"); await Promise.resolve(); latest = "B"; const second = save("B");
    gate.resolve(); await Promise.all([first, second]);
    expect(writes[1]).toEqual({ draft: "B", dirty: true, revision: "r2" });
    expect(writes[3]).toEqual({ draft: "B", dirty: false, revision: "r3" });
  });

  it("blocks queued network writes after conflict until an explicit resolution", async () => {
    const queue = new StudioSaveQueue(); queue.reset("r1"); const requests: string[] = [];
    await queue.run(async c => { requests.push("first"); c.conflict(); });
    await queue.run(async c => { if (!c.blocked()) requests.push("second"); });
    expect(requests).toEqual(["first"]);
    await queue.run(async c => { c.acknowledge("server-revision"); });
    await queue.run(async c => { expect(c.revision()).toBe("server-revision"); expect(c.blocked()).toBe(false); });
  });

  it("ignores old-session acknowledgements and queued tasks after reset", async () => {
    const queue = new StudioSaveQueue(); queue.reset("old"); const gate = deferred(); let queuedRan = false;
    const old = queue.run(async c => { await gate.promise; expect(c.active()).toBe(false); c.acknowledge("stale"); });
    const queued = queue.run(async () => { queuedRan = true; });
    await Promise.resolve(); queue.reset("new"); gate.resolve(); await Promise.all([old, queued]);
    expect(queuedRan).toBe(false);
    await queue.run(async c => { expect(c.revision()).toBe("new"); });
  });

  it("does not poison the queue after a rejected transport", async () => {
    const queue = new StudioSaveQueue(); await expect(queue.run(async () => { throw Error("network"); })).rejects.toThrow("network");
    let retried = false; await queue.run(async () => { retried = true; }); expect(retried).toBe(true);
  });

  it("rejects missing, mismatched and malformed acknowledgement receipts", () => {
    expect(validStudioSaveReceipt({ id: "p", updated_at: "2026-10-13T12:00:00Z" }, "p")).toBe(true);
    for (const value of [null, {}, { id: "other", updated_at: "2026-10-13T12:00:00Z" }, { id: "p", updated_at: "garbage" }]) {
      expect(validStudioSaveReceipt(value, "p")).toBe(false);
    }
  });
});

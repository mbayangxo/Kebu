/**
 * Builder save ordering (lib/create/section-save-coordinator.ts).
 *
 * Found by the Hero E2E: an image upload's autosave (props without the new overlay) was sent first
 * and finished last, overwriting the "Save draft" that carried the overlay — on the server and in
 * the Builder's local state — while the UI reported "Draft saved".
 *
 * Every request below is held until the test releases it, so each interleaving is deterministic.
 * `server` simulates the stored row: a request's props are written when that request completes,
 * so the last request to *complete* wins — exactly the failure mode without ordering.
 */
import { describe, expect, it } from "vitest";
import { SectionSaveCoordinator } from "@/lib/create/section-save-coordinator";

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

type Sent = { kind: "save" | "history"; id: string; props: Record<string, unknown>; version: number; done: ReturnType<typeof deferred> };

function harness() {
  const server: Record<string, Record<string, unknown>> = {};
  const sent: Sent[] = [];
  const applied: { id: string; props: Record<string, unknown> }[] = [];
  const coordinator: SectionSaveCoordinator = new SectionSaveCoordinator(async (id, props, version) => {
    const done = deferred();
    sent.push({ kind: "save", id, props, version, done });
    await done.promise;
    server[id] = props;
    if (coordinator.isCurrent(id, version)) applied.push({ id, props });
  });
  /** An Undo/Redo snapshot write, held like a request. */
  const history = (snapshot: Record<string, Record<string, unknown>>) =>
    coordinator.writeHistory(async () => {
      const done = deferred();
      sent.push({ kind: "history", id: "*", props: snapshot, version: -1, done });
      await done.promise;
      Object.assign(server, snapshot);
    });
  return { coordinator, server, sent, applied, history };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("SectionSaveCoordinator — section saves", () => {
  it("original race: a slow earlier autosave cannot overwrite the newer Save draft (server and local)", async () => {
    const { coordinator, server, sent, applied } = harness();
    coordinator.noteLocalEdit("hero");
    const autosave = coordinator.save("hero", { minHeight: "70vh", overlayOpacity: 0.45 });
    coordinator.noteLocalEdit("hero");
    const saveDraft = coordinator.save("hero", { minHeight: "70vh", overlayOpacity: 0.3 });
    await flush();
    expect(sent, "the newer save waits for the one in flight").toHaveLength(1);
    sent[0]!.done.resolve(); // the slow autosave finally completes
    await flush();
    expect(sent).toHaveLength(2);
    sent[1]!.done.resolve();
    await Promise.all([autosave, saveDraft]);
    expect(server.hero).toEqual({ minHeight: "70vh", overlayOpacity: 0.3 });
    expect(applied, "only the newest response may replace local props").toEqual([{ id: "hero", props: { minHeight: "70vh", overlayOpacity: 0.3 } }]);
  });

  it("saves requested while one is in flight coalesce to the newest props (one follow-up request)", async () => {
    const { coordinator, server, sent } = harness();
    const a = coordinator.save("hero", { v: 1 });
    const b = coordinator.save("hero", { v: 2 });
    const c = coordinator.save("hero", { v: 3 });
    await flush();
    sent[0]!.done.resolve();
    await flush();
    expect(sent.map((s) => s.props)).toEqual([{ v: 1 }, { v: 3 }]);
    sent[1]!.done.resolve();
    await Promise.all([a, b, c]);
    expect(server.hero).toEqual({ v: 3 });
  });

  it("re-requesting the props already in flight (Save draft right after the autosave) sends nothing new", async () => {
    const { coordinator, sent } = harness();
    const props = { v: 1 };
    const autosave = coordinator.save("hero", props);
    const saveDraft = coordinator.save("hero", props);
    await flush();
    sent[0]!.done.resolve();
    await Promise.all([autosave, saveDraft]);
    expect(sent).toHaveLength(1);
  });

  it("a response for an older edit is reported stale, so it cannot replace newer local props", async () => {
    const { coordinator, sent, applied } = harness();
    coordinator.noteLocalEdit("hero");
    const p = coordinator.save("hero", { image: "x" });
    await flush();
    coordinator.noteLocalEdit("hero"); // the user keeps editing while the save is in flight
    sent[0]!.done.resolve();
    await p;
    expect(applied).toEqual([]);
  });

  it("different sections save independently", async () => {
    const { coordinator, sent } = harness();
    void coordinator.save("a", { v: 1 });
    void coordinator.save("b", { v: 1 });
    await flush();
    expect(sent.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("a failed save does not block later saves", async () => {
    let calls = 0;
    const coordinator = new SectionSaveCoordinator(async () => {
      calls++;
      if (calls === 1) throw new Error("network");
    });
    await expect(coordinator.save("hero", { v: 1 })).resolves.toBeUndefined();
    await coordinator.save("hero", { v: 2 });
    expect(calls).toBe(2);
  });
});

describe("SectionSaveCoordinator — Undo/Redo history writes", () => {
  it("Undo while an autosave is in flight: queued saves are dropped, the in-flight response is stale, the snapshot is written last", async () => {
    const { coordinator, server, sent, applied, history } = harness();
    coordinator.noteLocalEdit("hero");
    void coordinator.save("hero", { heading: "EDIT" });
    coordinator.noteLocalEdit("hero");
    void coordinator.save("hero", { heading: "EDIT 2" }); // queued behind the in-flight save
    await flush();
    const undo = history({ hero: { heading: "original" } });
    await flush();
    expect(sent.map((s) => s.kind), "the snapshot waits for the save in flight").toEqual(["save"]);
    sent[0]!.done.resolve();
    await flush();
    expect(sent.map((s) => s.kind), "the queued save was dropped").toEqual(["save", "history"]);
    sent[1]!.done.resolve();
    await undo;
    expect(server.hero).toEqual({ heading: "original" });
    expect(applied, "the in-flight response did not revert the undone local state").toEqual([]);
  });

  it("Undo alone makes the response of a save in flight stale (it cannot overwrite the undone local props)", async () => {
    const { coordinator, sent, applied, history } = harness();
    coordinator.noteLocalEdit("hero");
    void coordinator.save("hero", { heading: "EDIT" });
    await flush();
    const undo = history({ hero: { heading: "original" } });
    sent[0]!.done.resolve();
    await flush();
    sent[1]!.done.resolve();
    await undo;
    expect(applied).toEqual([]);
  });

  it("an edit made after Undo waits for the snapshot and is written after it (the edit wins)", async () => {
    const { coordinator, server, sent, applied, history } = harness();
    void coordinator.save("hero", { heading: "EDIT" });
    await flush();
    const undo = history({ hero: { heading: "original" } });
    coordinator.noteLocalEdit("hero");
    const edit = coordinator.save("hero", { heading: "after undo" });
    let editDone = false;
    void edit.then(() => { editDone = true; });
    sent[0]!.done.resolve();
    await flush();
    expect(sent.map((s) => s.kind)).toEqual(["save", "history"]);
    sent[1]!.done.resolve();
    await undo;
    await flush();
    expect(sent.map((s) => s.kind), "the edit is sent only after the snapshot").toEqual(["save", "history", "save"]);
    expect(editDone, "Save draft's promise waits for the edit to be answered").toBe(false);
    sent[2]!.done.resolve();
    await edit;
    expect(server.hero).toEqual({ heading: "after undo" });
    expect(applied).toEqual([{ id: "hero", props: { heading: "after undo" } }]);
  });

  it("rapid Undo, Undo while a save is in flight: one batch write, the newest snapshot", async () => {
    const { coordinator, server, sent, history } = harness();
    void coordinator.save("hero", { heading: "C" });
    await flush();
    const first = history({ hero: { heading: "B" } });
    const second = history({ hero: { heading: "A" } });
    sent[0]!.done.resolve();
    await flush();
    expect(sent.filter((s) => s.kind === "history").map((s) => s.props)).toEqual([{ hero: { heading: "A" } }]);
    sent[1]!.done.resolve();
    await Promise.all([first, second]);
    expect(server.hero).toEqual({ heading: "A" });
  });

  it("a history write requested while another is being written runs after it — never concurrently", async () => {
    const { server, sent, history } = harness();
    const undo = history({ hero: { heading: "B" } });
    await flush();
    expect(sent).toHaveLength(1);
    const redo = history({ hero: { heading: "C" } });
    await flush();
    expect(sent, "the second snapshot waits for the first request").toHaveLength(1);
    sent[0]!.done.resolve();
    await flush();
    expect(sent).toHaveLength(2);
    sent[1]!.done.resolve();
    await Promise.all([undo, redo]);
    expect(server.hero).toEqual({ heading: "C" });
  });

  it("a failed history write does not block later saves or history writes", async () => {
    const { coordinator, server, sent } = harness();
    const failing = coordinator.writeHistory(async () => { throw new Error("network"); });
    await expect(failing).rejects.toThrow("network");
    const edit = coordinator.save("hero", { heading: "next" });
    await flush();
    sent[0]!.done.resolve();
    await edit;
    expect(server.hero).toEqual({ heading: "next" });
    await coordinator.writeHistory(async () => { server.hero = { heading: "undone" }; });
    expect(server.hero).toEqual({ heading: "undone" });
  });
});

describe("SectionSaveCoordinator — Add / Remove (structural writes)", () => {
  const structural = (h: ReturnType<typeof harness>, label: string, retire: string[] = []) =>
    h.coordinator.exclusive(async () => {
      const done = deferred();
      h.sent.push({ kind: "history", id: label, props: {}, version: -1, done });
      await done.promise;
    }, retire);

  it("Remove while the section's autosave is queued: the queued save is dropped, the in-flight response is stale, the delete runs after it", async () => {
    const h = harness();
    h.coordinator.noteLocalEdit("hero");
    void h.coordinator.save("hero", { heading: "EDIT" });
    void h.coordinator.save("hero", { heading: "EDIT 2" }); // queued (same edit version: only Remove can make it stale)
    await flush();
    const remove = structural(h, "delete hero", ["hero"]);
    await flush();
    expect(h.sent.map((x) => x.id), "the delete waits for the save in flight").toEqual(["hero"]);
    h.sent[0]!.done.resolve();
    await flush();
    expect(h.sent.map((x) => x.id), "the queued save was dropped").toEqual(["hero", "delete hero"]);
    h.sent[1]!.done.resolve();
    await remove;
    await flush();
    expect(h.sent, "the dropped save is never sent after the delete").toHaveLength(2);
    expect(h.applied, "the in-flight response cannot update the removed section").toEqual([]);
  });

  it("an Add does not drop other sections' saves: edits requested meanwhile are sent after it", async () => {
    const h = harness();
    const add = structural(h, "add section");
    const edit = h.coordinator.save("text", { body: "typed during Add" });
    await flush();
    expect(h.sent.map((x) => x.id)).toEqual(["add section"]);
    h.sent[0]!.done.resolve();
    await add;
    await flush();
    expect(h.sent.map((x) => x.id)).toEqual(["add section", "text"]);
    h.sent[1]!.done.resolve();
    await edit;
    expect(h.server.text).toEqual({ body: "typed during Add" });
  });

  it("Add, Remove and Undo run in the order they were requested — never concurrently", async () => {
    const h = harness();
    const add = structural(h, "add");
    const remove = structural(h, "remove", ["x"]);
    const undo = h.history({ x: { restored: true } });
    for (let i = 0; i < 3; i++) {
      await flush();
      expect(h.sent, `only one write in flight (step ${i})`).toHaveLength(i + 1);
      h.sent[i]!.done.resolve();
    }
    await Promise.all([add, remove, undo]);
    expect(h.sent.map((x) => x.id)).toEqual(["add", "remove", "*"]);
  });

  it("idle() resolves only after every chained write and every requested save has finished (Publish)", async () => {
    const h = harness();
    void h.coordinator.save("hero", { v: 1 });
    void structural(h, "remove", ["faq"]);
    let idle = false;
    const waiting = h.coordinator.idle().then(() => { idle = true; });
    for (let i = 0; i < 2; i++) {
      await flush();
      expect(idle).toBe(false);
      h.sent[i]!.done.resolve();
    }
    await waiting;
    expect(idle).toBe(true);
  });
});

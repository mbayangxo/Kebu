import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _setQueueForTesting, enqueueSaveSection, isOfflineQueueDurable, listOfflineQueue, removeOfflineQueueItem } from "@/lib/create/offline-queue";

beforeEach(() => _setQueueForTesting([]));
afterEach(() => { vi.unstubAllGlobals(); _setQueueForTesting([]); });

function browserStorage() {
  const stored = new Map<string, string>();
  let rejectWrites = false;
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectWrites) throw new Error("QuotaExceededError");
      stored.set(key, value);
    },
  }, dispatchEvent: vi.fn() });
  return { stored, fail: () => { rejectWrites = true; }, recover: () => { rejectWrites = false; } };
}

const payload = (text: string, sectionId = "hero") => ({ projectId: "project", sectionId, props: { text } });

describe("Offline queue storage failure", () => {
  it("a failed newer write cannot be replaced by the old stored payload on the next read", () => {
    const storage = browserStorage();
    enqueueSaveSection(payload("old"));
    storage.fail();
    enqueueSaveSection(payload("newest local text"));
    expect(listOfflineQueue()).toHaveLength(1);
    expect(listOfflineQueue()[0].payload).toEqual(payload("newest local text"));
    expect(isOfflineQueueDurable()).toBe(false);
    expect([...storage.stored.values()][0]).toContain('"old"');
  });
  it("a failed first write remains visible rather than returning an empty stored queue", () => {
    const storage = browserStorage(); storage.fail();
    enqueueSaveSection(payload("pending"));
    expect(listOfflineQueue()).toHaveLength(1);
    expect(isOfflineQueueDurable()).toBe(false);
  });
  it("denied access to the localStorage getter retains the session's work", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("SecurityError"); }, dispatchEvent: vi.fn() });
    expect(() => enqueueSaveSection(payload("pending"))).not.toThrow();
    expect(listOfflineQueue()[0].payload).toEqual(payload("pending"));
    expect(isOfflineQueueDurable()).toBe(false);
  });
  it("the next successful write persists the latest session queue, without resurrecting old edits", () => {
    const storage = browserStorage();
    enqueueSaveSection(payload("old")); storage.fail();
    const latest = enqueueSaveSection(payload("new"));
    storage.recover();
    enqueueSaveSection(payload("footer draft", "footer"));
    expect(isOfflineQueueDurable()).toBe(true);
    const serialized = JSON.parse([...storage.stored.values()][0]);
    expect(serialized).toHaveLength(2);
    expect(serialized[0].id).toBe(latest.id);
    expect(serialized[0].payload.props.text).toBe("new");
  });
  it("a failed removal does not resurrect an already acknowledged mutation from storage", () => {
    const storage = browserStorage();
    const item = enqueueSaveSection(payload("saved")); storage.fail();
    removeOfflineQueueItem(item.id);
    expect(listOfflineQueue()).toEqual([]);
    expect(isOfflineQueueDurable()).toBe(false);
  });
});

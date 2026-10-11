import { describe, expect, it, vi } from "vitest";
import { createDirectoryLoader, type DirectoryState } from "@/lib/network/directory-loader";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (id: string) => Response.json({ profiles: [{ id }], hasMore: false });
const current = (change: ReturnType<typeof vi.fn>) => change.mock.calls.at(-1)?.[0] as DirectoryState;

describe("Network directory session and request boundaries", () => {
  it("clears listed members immediately on sign out", async () => {
    const change = vi.fn();
    const loader = createDirectoryLoader(change, vi.fn().mockResolvedValue(response("member")));
    await loader.reload();
    expect(current(change).profiles).toHaveLength(1);
    loader.sessionChanged(null);
    expect(current(change)).toMatchObject({ profiles: [], loading: false, signedOut: true, hasMore: false });
  });
  it("prevents an old request from repopulating the page after sign out even if abort is ignored", async () => {
    const old = deferred<Response>();
    const change = vi.fn();
    const fetcher = vi.fn().mockReturnValue(old.promise);
    const loader = createDirectoryLoader(change, fetcher);
    const loading = loader.reload();
    loader.sessionChanged(null);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    old.resolve(response("old-member"));
    await loading;
    expect(current(change)).toMatchObject({ profiles: [], signedOut: true });
  });
  it("clears old data and ignores a previous account's late response during an account switch", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const change = vi.fn();
    const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const loader = createDirectoryLoader(change, fetcher);
    loader.sessionChanged("owner-a");
    loader.sessionChanged("owner-b");
    expect(current(change)).toMatchObject({ profiles: [], loading: true });
    second.resolve(response("new-member"));
    await vi.waitFor(() => expect(current(change).profiles).toEqual([{ id: "new-member" }]));
    first.resolve(response("old-member"));
    await first.promise;
    await Promise.resolve(); await Promise.resolve();
    expect(current(change).profiles).toEqual([{ id: "new-member" }]);
  });
  it("does not reload for token refreshes and repeated events from the same identity", async () => {
    const change = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(response("member"));
    const loader = createDirectoryLoader(change, fetcher);
    loader.sessionChanged("owner-a");
    await vi.waitFor(() => expect(current(change).loading).toBe(false));
    loader.sessionChanged("owner-a");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps the latest retry when earlier successful responses arrive out of order", async () => {
    const old = deferred<Response>();
    const change = vi.fn();
    const loader = createDirectoryLoader(change, vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(response("latest")));
    const earlier = loader.reload();
    await loader.reload();
    old.resolve(response("outdated"));
    await earlier;
    expect(current(change).profiles).toEqual([{ id: "latest" }]);
  });
  it("ignores late failures from the previous account", async () => {
    const old = deferred<Response>();
    const change = vi.fn();
    const loader = createDirectoryLoader(change, vi.fn().mockReturnValue(old.promise));
    const loading = loader.reload();
    loader.sessionChanged(null);
    old.reject(new Error("private transport error"));
    await loading;
    expect(current(change).error).toBe("Sign in to browse member profiles.");
  });
  it("does not write state or fetch again after disposal", async () => {
    const old = deferred<Response>();
    const change = vi.fn();
    const fetcher = vi.fn().mockReturnValue(old.promise);
    const loader = createDirectoryLoader(change, fetcher);
    const loading = loader.reload();
    loader.dispose();
    const count = change.mock.calls.length;
    old.resolve(response("old-member"));
    await loading;
    await loader.reload();
    loader.sessionChanged("owner-b");
    expect(change).toHaveBeenCalledTimes(count);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([401, 503])("separates status %s from an empty directory without exposing raw server errors", async status => {
    const change = vi.fn();
    const loader = createDirectoryLoader(change, vi.fn().mockResolvedValue(Response.json({ error: "private detail" }, { status })));
    await loader.reload();
    expect(current(change)).toMatchObject({ profiles: [], loading: false, signedOut: status === 401 });
    expect(current(change).error).not.toContain("private detail");
  });
  it("handles invalid success responses and lets an explicit retry recover", async () => {
    const change = vi.fn();
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ profiles: null })).mockResolvedValueOnce(response("member"));
    const loader = createDirectoryLoader(change, fetcher);
    await loader.reload();
    expect(current(change).error).toBeTruthy();
    await loader.reload();
    expect(current(change)).toMatchObject({ profiles: [{ id: "member" }], error: null, loading: false });
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
  });
});

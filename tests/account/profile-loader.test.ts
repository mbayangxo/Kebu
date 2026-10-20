import { describe, expect, it, vi } from "vitest";
import { createProfileLoader } from "@/lib/account/profile-loader";
import type { MeProfile } from "@/lib/account/user-profile";
function deferred() {
  let resolve!: (profile: MeProfile | null) => void;
  const promise = new Promise<MeProfile | null>(done => { resolve = done; });
  return { promise, resolve };
}
const profile = (id: string) => ({ id } as MeProfile);
describe("Kebu profile session boundaries", () => {
  it("renders an unavailable state instead of throwing on missing auth", async () => {
    const change = vi.fn();
    await createProfileLoader(async () => { throw Error("private configuration"); }, change).refresh();
    expect(change.mock.lastCall?.[0]).toEqual({ profile: null, loading: false, error: "Sign-in is temporarily unavailable. Please retry." });
  });
  it("a late refresh cannot restore a signed-out profile", async () => {
    const pending = deferred(), change = vi.fn();
    const loader = createProfileLoader(() => pending.promise, change);
    const refresh = loader.refresh(); loader.signedOut(); pending.resolve(profile("old-owner")); await refresh;
    expect(change.mock.lastCall?.[0]).toEqual({ profile: null, loading: false, error: null });
  });
  it("keeps a newer account when older responses arrive last", async () => {
    const old = deferred(), current = deferred(), change = vi.fn();
    const loader = createProfileLoader(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise), change);
    const first = loader.refresh(), second = loader.refresh();
    current.resolve(profile("new-owner")); await second;
    old.resolve(profile("old-owner")); await first;
    expect(change.mock.lastCall?.[0].profile.id).toBe("new-owner");
  });
  it("ignores responses and refresh calls after disposal", async () => {
    const pending = deferred(), change = vi.fn(), load = vi.fn(() => pending.promise);
    const loader = createProfileLoader(load, change), refresh = loader.refresh(); loader.dispose();
    const count = change.mock.calls.length; pending.resolve(profile("owner")); await refresh; await loader.refresh();
    expect(change).toHaveBeenCalledTimes(count); expect(load).toHaveBeenCalledTimes(1);
  });
});

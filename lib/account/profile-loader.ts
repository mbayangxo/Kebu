import type { MeProfile } from "./user-profile";

export type ProfileState = { profile: MeProfile | null; loading: boolean; error: string | null };
/** A refresh or sign-out invalidates every earlier account/profile response. */
export function createProfileLoader(
  load: () => Promise<MeProfile | null>,
  change: (state: ProfileState) => void,
) {
  let generation = 0;
  let disposed = false;
  async function refresh() {
    if (disposed) return;
    const current = ++generation;
    change({ profile: null, loading: true, error: null });
    try {
      const profile = await load();
      if (!disposed && current === generation) change({ profile, loading: false, error: null });
    } catch {
      if (!disposed && current === generation) change({ profile: null, loading: false, error: "Sign-in is temporarily unavailable. Please retry." });
    }
  }
  function signedOut() {
    if (disposed) return;
    generation++;
    change({ profile: null, loading: false, error: null });
  }
  function dispose() { disposed = true; generation++; }
  return { refresh, signedOut, dispose };
}

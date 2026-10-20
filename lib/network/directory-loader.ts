import type { DirectoryProfile } from "./types";

export type DirectoryState = {
  profiles: DirectoryProfile[];
  loading: boolean;
  error: string | null;
  signedOut: boolean;
  hasMore: boolean;
};
export const initialDirectoryState: DirectoryState = {
  profiles: [], loading: true, error: null, signedOut: false, hasMore: false,
};

/** Session changes invalidate both displayed data and every pending response. */
export function createDirectoryLoader(
  onChange: (state: DirectoryState) => void,
  fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch,
) {
  let revision = 0;
  let disposed = false;
  let identity: string | null | undefined;
  let controller: AbortController | undefined;
  function invalidate() {
    revision++;
    controller?.abort();
  }
  async function reload() {
    if (disposed) return;
    invalidate();
    const current = revision;
    controller = new AbortController();
    onChange({ ...initialDirectoryState });
    const active = () => !disposed && current === revision;
    try {
      const response = await fetcher("/api/network/profiles", { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!active()) return;
      if (!response.ok) {
        onChange({ ...initialDirectoryState, loading: false, signedOut: response.status === 401,
          error: response.status === 401 ? "Sign in to browse member profiles." : "Could not load members. Please retry." });
        return;
      }
      if (!Array.isArray(result.profiles)) throw new Error("Invalid directory response");
      onChange({ profiles: result.profiles, hasMore: result.hasMore === true,
        loading: false, signedOut: false, error: null });
    } catch {
      if (active()) onChange({ ...initialDirectoryState, loading: false, error: "Could not load members. Please retry." });
    }
  }
  function sessionChanged(userId: string | null) {
    if (disposed || identity === userId) return;
    identity = userId;
    if (userId === null) {
      invalidate();
      onChange({ ...initialDirectoryState, loading: false, signedOut: true,
        error: "Sign in to browse member profiles." });
    } else {
      void reload();
    }
  }
  function dispose() {
    disposed = true;
    invalidate();
  }
  return { reload, sessionChanged, dispose };
}

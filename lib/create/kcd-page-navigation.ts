import { enqueueSyncNav } from "@/lib/create/offline-queue";
import { siteChromeSchema } from "@/lib/create/site-chrome";

/** Source chrome is reconciled separately from a confirmed page transaction. */
export async function reconcilePageNavigation(projectId: string) {
  try {
    const sync = await fetch(`/api/projects/${projectId}/site-chrome/sync-nav`, { method: "POST", credentials: "include" });
    if (!sync.ok) throw new Error("Navigation could not be synchronized.");
    const response = await fetch(`/api/projects/${projectId}/site-chrome`, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("Updated navigation could not be loaded.");
    return siteChromeSchema.parse((await response.json()).siteChrome);
  } catch {
    try { enqueueSyncNav({ projectId }); }
    catch { throw new Error("Page saved, but navigation could not be synchronized or queued. Keep this page open and retry Save."); }
    throw new Error("Page saved, but navigation still needs synchronization. Retry Save or sync Offline changes.");
  }
}

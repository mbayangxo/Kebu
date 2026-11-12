import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueuePlatformJob } from "@/lib/platform/jobs";
import { platformLog } from "@/lib/platform/observability";
import type { CloudQuota } from "@/lib/cloud/quota";

/** Checked highest-first so crossing straight to 100% doesn't also fire the 80% warning. */
const WARNING_THRESHOLDS = [100, 80] as const;

/**
 * Fires at most once per threshold per calendar day (the idempotency key
 * includes today's date), so a user who stays over 80% doesn't get the same
 * warning on every single upload, but does get re-warned on a later day if
 * they're still over — rather than going silent forever after the first hit.
 */
export async function maybeNotifyCloudStorageThreshold(
  admin: SupabaseClient,
  ownerId: string,
  quota: CloudQuota,
): Promise<boolean> {
  if (quota.limitBytes <= 0) return false;
  const usedPercent = (quota.usedBytes / quota.limitBytes) * 100;
  const threshold = WARNING_THRESHOLDS.find((t) => usedPercent >= t);
  if (!threshold) return false;

  const today = new Date().toISOString().slice(0, 10);
  try {
    await enqueuePlatformJob(admin, {
      type: "notification.create",
      idempotencyKey: `notify:cloud_storage_warning:${ownerId}:${threshold}:${today}`,
      payload: {
        userId: ownerId,
        kind: "cloud.storage_warning",
        title: threshold >= 100 ? "Cloud storage full" : "Cloud storage almost full",
        body: threshold >= 100
          ? `You've used all of your ${quota.tierName} plan's storage. Delete files or upgrade to keep uploading.`
          : `You've used ${Math.round(usedPercent)}% of your ${quota.tierName} plan's storage.`,
        actionUrl: "/cloud",
        metadata: { usedBytes: quota.usedBytes, limitBytes: quota.limitBytes, threshold },
      },
    });
    return true;
  } catch (cause) {
    platformLog.error("cloud_storage.warning_notify_failed", {
      ownerId, threshold,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return false;
  }
}

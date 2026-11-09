import type { SupabaseClient } from "@supabase/supabase-js";
import { getKebuPlan } from "@/lib/billing/plans";
import { resolveOwnerBestTier } from "@/lib/billing/enforce-limits";

export type CloudQuota = {
  usedBytes: number;
  limitBytes: number;
  tierName: string;
};

async function cloudStorageUsedBytes(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const [filesRes, versionsRes] = await Promise.all([
    supabase
      .from("cloud_storage_files")
      .select("size_bytes, cloud_storage_buckets!inner(owner_id)")
      .eq("cloud_storage_buckets.owner_id", ownerId),
    supabase
      .from("cloud_deployment_versions")
      .select("size_bytes, cloud_deployments!inner(owner_id)")
      .eq("cloud_deployments.owner_id", ownerId),
  ]);

  const fileBytes = (filesRes.data ?? []).reduce((sum, r) => sum + (r.size_bytes ?? 0), 0);
  const versionBytes = (versionsRes.data ?? []).reduce((sum, r) => sum + (r.size_bytes ?? 0), 0);
  return fileBytes + versionBytes;
}

/**
 * Reuses lib/billing/plans.ts's existing (previously unenforced) storageMb
 * field as the real per-account cap, combining Cloud Storage files and all
 * deployment versions (not just the live one -- disk actually used, not just
 * what's currently served) into one quota.
 */
export async function getCloudQuota(supabase: SupabaseClient, ownerId: string): Promise<CloudQuota> {
  const [tier, usedBytes] = await Promise.all([
    resolveOwnerBestTier(supabase, ownerId),
    cloudStorageUsedBytes(supabase, ownerId),
  ]);
  const plan = getKebuPlan(tier);
  return {
    usedBytes,
    limitBytes: plan.limits.storageMb * 1024 * 1024,
    tierName: plan.name,
  };
}

export async function assertCloudStorageQuota(
  supabase: SupabaseClient,
  ownerId: string,
  additionalBytes: number,
): Promise<{ ok: true; remainingBytes: number } | { ok: false; error: string }> {
  const quota = await getCloudQuota(supabase, ownerId);
  const remaining = quota.limitBytes - quota.usedBytes;
  if (additionalBytes > remaining) {
    const remainingMb = Math.max(0, remaining / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `Not enough storage left on your ${quota.tierName} plan (${remainingMb} MB remaining). Delete files or upgrade.`,
    };
  }
  return { ok: true, remainingBytes: remaining };
}

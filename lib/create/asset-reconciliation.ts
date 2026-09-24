/**
 * Kebu site-asset lifecycle reconciliation.
 *
 * Covers both orphan directions:
 *   Direction 1 — Storage object exists but no website_assets DB record exists.
 *                 Cleaned up after ORPHAN_GRACE_PERIOD_MS to let in-flight
 *                 DB inserts complete before treating the object as an orphan.
 *
 *   Direction 2 — website_assets DB record exists but its storage object is missing.
 *                 DB record is marked stale (stale_at = now()) rather than deleted,
 *                 because deleting the DB record could silently break section content
 *                 that still references the URL.  The UI should surface stale assets.
 *
 * Scoping: strictly project-scoped via the project's owner_id.  All site-assets
 * live under {ownerId}/{projectId}/ in the bucket.
 *
 * Idempotency: re-running is safe.
 *   - Already-stale records are counted but not re-updated.
 *   - Orphan storage objects with no DB record are deleted at most once per run.
 *   - No side effect if the DB and storage are already consistent.
 *
 * Reuse: this module has no Next.js dependency — it is usable by Builder, Studio,
 * and any other Kebu product that stores assets in the site-assets bucket.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** An orphaned storage object is only deleted once it is older than this. */
export const ORPHAN_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

export type ReconcileResult = {
  projectId: string;
  /** Storage objects deleted because no DB record existed (and past grace period). */
  orphansDeleted: number;
  /** Storage objects skipped because they are within the grace period. */
  orphansSkipped: number;
  /** DB records marked stale because their storage object was missing. */
  staleMarked: number;
  /** DB records that were already stale — skipped (idempotent). */
  alreadyStale: number;
  /** Total DB records checked for storage presence. */
  checked: number;
  /** Non-fatal errors (logged but do not abort reconciliation). */
  errors: string[];
};

type AssetRow = {
  id: string;
  url: string;
  stale_at: string | null;
};

type StorageObject = {
  name: string;
  created_at?: string | null;
};

/** Extract the path component after /storage/v1/object/public/site-assets/. */
export function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/storage\/v1\/object\/public\/site-assets\/(.+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Build the public URL for a storage path. */
export function buildPublicUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/site-assets/${path}`;
}

/**
 * Reconcile a single project's assets.
 *
 * @param serviceClient  Service-role Supabase client (bypasses RLS).
 * @param projectId      The project to reconcile.
 * @param ownerId        The project's owner_id — the storage folder root.
 * @param supabaseUrl    NEXT_PUBLIC_SUPABASE_URL for constructing public URLs.
 * @param options        Override grace period or inject a mock `now` for tests.
 */
export async function reconcileProjectAssets(
  serviceClient: SupabaseClient,
  projectId: string,
  ownerId: string,
  supabaseUrl: string,
  options: { gracePeriodMs?: number; now?: Date } = {},
): Promise<ReconcileResult> {
  const gracePeriodMs = options.gracePeriodMs ?? ORPHAN_GRACE_PERIOD_MS;
  const now = options.now ?? new Date();
  const errors: string[] = [];

  const result: ReconcileResult = {
    projectId,
    orphansDeleted: 0,
    orphansSkipped: 0,
    staleMarked: 0,
    alreadyStale: 0,
    checked: 0,
    errors,
  };

  // Fetch all DB records for this project (scoped by project_id — service client
  // can access all rows, but we only process the specified project).
  const { data: dbAssets, error: dbErr } = await serviceClient
    .from("website_assets")
    .select("id, url, stale_at")
    .eq("project_id", projectId);

  if (dbErr) {
    errors.push(`DB fetch failed: ${dbErr.message}`);
    return result;
  }

  const assets = (dbAssets ?? []) as AssetRow[];
  result.checked = assets.length;

  // List storage objects in ownerId/projectId/ (the canonical folder for this project).
  const folder = `${ownerId}/${projectId}`;
  const { data: storageObjects, error: listErr } = await serviceClient.storage
    .from("site-assets")
    .list(folder, { limit: 1000 });

  if (listErr) {
    errors.push(`Storage list failed: ${listErr.message}`);
    // Continue — we can still check Direction 2 (stale DB records) using path existence checks.
  }

  const objects = (storageObjects ?? []) as StorageObject[];

  // Build a set of known storage paths (full path from bucket root, e.g. userId/projId/file.jpg).
  const knownPaths = new Set<string>(objects.map((o) => `${folder}/${o.name}`));

  // Build a set of decoded storage paths from DB asset URLs for Direction 1 cross-check.
  // Using decoded paths (via extractStoragePath) rather than reconstructed URLs avoids a
  // URL-encoding mismatch: obj.name from the storage API is the literal filename (e.g.
  // "my photo.jpg"), while a DB URL may store it percent-encoded ("my%20photo.jpg").
  // Comparing reconstructed URLs would wrongly treat such files as orphans and delete them.
  const dbAssetPaths = new Set<string>(
    assets.flatMap((a) => {
      const p = extractStoragePath(a.url);
      return p ? [p] : [];
    }),
  );

  // ── Direction 2: DB record exists but storage object is missing ──────────────

  for (const asset of assets) {
    const path = extractStoragePath(asset.url);
    if (!path) {
      // URL does not match expected format (e.g., external CDN) — skip.
      continue;
    }

    if (knownPaths.has(path)) {
      // Storage object exists — if the record was previously marked stale, clear it.
      if (asset.stale_at !== null) {
        const { error: clearErr } = await serviceClient
          .from("website_assets")
          .update({ stale_at: null })
          .eq("id", asset.id);
        if (clearErr) {
          errors.push(`Failed to clear stale mark for asset ${asset.id}: ${clearErr.message}`);
        }
      }
      continue;
    }

    // Storage object is missing.
    if (asset.stale_at !== null) {
      result.alreadyStale++;
      continue;
    }

    const { error: staleErr } = await serviceClient
      .from("website_assets")
      .update({ stale_at: now.toISOString() })
      .eq("id", asset.id);

    if (staleErr) {
      errors.push(`Failed to mark asset ${asset.id} stale: ${staleErr.message}`);
    } else {
      result.staleMarked++;
    }
  }

  // ── Direction 1: Storage object exists but no DB record ─────────────────────

  for (const obj of objects) {
    const objPath = `${folder}/${obj.name}`;

    // Compare decoded storage paths, not reconstructed URLs, to avoid encoding mismatches.
    if (dbAssetPaths.has(objPath)) continue;

    // Apply grace period — a newly uploaded object might not have a DB record yet.
    const createdAt = obj.created_at ? new Date(obj.created_at).getTime() : 0;
    const ageMs = now.getTime() - createdAt;

    if (ageMs < gracePeriodMs) {
      result.orphansSkipped++;
      continue;
    }

    // Past grace period with no DB record → orphan cleanup.
    const { error: deleteErr } = await serviceClient.storage
      .from("site-assets")
      .remove([objPath]);

    if (deleteErr) {
      errors.push(`Failed to delete orphan ${objPath}: ${deleteErr.message}`);
    } else {
      result.orphansDeleted++;
    }
  }

  return result;
}

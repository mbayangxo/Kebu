import { z } from "zod";

export const STUDIO_VERSION_CAP = 40;
/** Minimum gap between automatic checkpoints (ms). */
export const STUDIO_VERSION_AUTO_MIN_GAP_MS = 90_000;

export const createVersionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});

export const restoreVersionSchema = z.object({
  versionId: z.string().uuid(),
});

export type StudioDesignVersionMeta = {
  id: string;
  design_id: string;
  created_by: string;
  label: string | null;
  source: "auto" | "manual" | "pre_restore";
  created_at: string;
};

export function shouldRecordAutoVersion(lastCreatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastCreatedAt) return true;
  const t = Date.parse(lastCreatedAt);
  if (Number.isNaN(t)) return true;
  return now - t >= STUDIO_VERSION_AUTO_MIN_GAP_MS;
}

export function versionsToKeep(idsNewestFirst: string[], cap = STUDIO_VERSION_CAP): {
  keep: string[];
  drop: string[];
} {
  const keep = idsNewestFirst.slice(0, cap);
  const drop = idsNewestFirst.slice(cap);
  return { keep, drop };
}

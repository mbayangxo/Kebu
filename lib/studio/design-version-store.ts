import type { SupabaseClient } from "@supabase/supabase-js";
import {
  shouldRecordAutoVersion,
  STUDIO_VERSION_CAP,
  versionsToKeep,
} from "@/lib/studio/design-versions";

type InsertSource = "auto" | "manual" | "pre_restore";

/** Insert a canvas snapshot and prune older rows for this design. */
export async function insertDesignVersion(
  supabase: SupabaseClient,
  opts: {
    designId: string;
    userId: string;
    canvas: unknown;
    source: InsertSource;
    label?: string | null;
  },
): Promise<{ id: string } | { error: string; status: number }> {
  const { data, error } = await supabase
    .from("studio_design_versions")
    .insert({
      design_id: opts.designId,
      created_by: opts.userId,
      canvas: opts.canvas,
      source: opts.source,
      label: opts.label ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const missing = error?.message?.includes("does not exist");
    return {
      error: missing
        ? "Design versions table missing. Apply migration 078."
        : "Could not save version.",
      status: missing ? 503 : 500,
    };
  }

  const { data: rows } = await supabase
    .from("studio_design_versions")
    .select("id")
    .eq("design_id", opts.designId)
    .order("created_at", { ascending: false });

  const ids = (rows ?? []).map((r) => r.id as string);
  const { drop } = versionsToKeep(ids, STUDIO_VERSION_CAP);
  if (drop.length) {
    await supabase.from("studio_design_versions").delete().in("id", drop);
  }

  return { id: data.id as string };
}

/** Maybe checkpoint previous canvas before a new canvas write. */
export async function maybeAutoCheckpointPreviousCanvas(
  supabase: SupabaseClient,
  opts: {
    designId: string;
    userId: string;
    previousCanvas: unknown;
  },
): Promise<void> {
  const { data: latest } = await supabase
    .from("studio_design_versions")
    .select("created_at")
    .eq("design_id", opts.designId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!shouldRecordAutoVersion(latest?.created_at as string | undefined)) return;

  await insertDesignVersion(supabase, {
    designId: opts.designId,
    userId: opts.userId,
    canvas: opts.previousCanvas,
    source: "auto",
    label: "Autosave checkpoint",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ProjectRow = { id: string; owner_id: string };

/**
 * Enqueue asset.reconcile platform jobs for all projects that have website_assets.
 *
 * The actual reconciliation runs asynchronously via the platform worker.
 * At most one pending job per project (deduped via source_job_id or upsert).
 *
 * Schedule: daily at 03:00 UTC (see vercel.json).
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service credentials missing." },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date();

  // Fetch projects that have at least one asset entry.
  const { data: projects, error: projectsErr } = await admin
    .from("projects")
    .select("id, owner_id")
    .in(
      "id",
      (await admin.from("website_assets").select("project_id")).data?.map(
        (r: { project_id: string }) => r.project_id,
      ) ?? [],
    );

  if (projectsErr) {
    return NextResponse.json({ error: projectsErr.message }, { status: 500 });
  }

  const rows = (projects ?? []) as ProjectRow[];
  let enqueued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const { error: jobErr } = await admin.from("platform_jobs").insert({
      job_type: "asset.reconcile",
      payload: { projectId: row.id, ownerId: row.owner_id },
      max_attempts: 3,
      run_after: new Date().toISOString(),
    });
    if (jobErr) {
      // Duplicate or transient — skip rather than crash the whole batch.
      skipped++;
      errors.push(`project ${row.id}: ${jobErr.message}`);
    } else {
      enqueued++;
    }
  }

  const summary = { enqueued, skipped, total: rows.length };
  await recordPlatformCronRun(admin, {
    jobName: "asset-cleanup",
    status: errors.length > 0 ? "partial" : "ok",
    startedAt,
    summary,
  });

  return NextResponse.json({ ...summary, errors: errors.slice(0, 10) });
}

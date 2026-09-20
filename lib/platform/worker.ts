import type { SupabaseClient } from "@supabase/supabase-js";
import { failPlatformJob } from "@/lib/platform/jobs";
import { platformLog } from "@/lib/platform/observability";

type Job = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

async function executeJob(admin: SupabaseClient, job: Job) {
  if (job.job_type === "notification.create") {
    const p = job.payload;
    if (typeof p.userId !== "string" || typeof p.title !== "string") {
      throw new Error("Invalid notification.create payload");
    }
    const { error } = await admin.from("user_notifications").insert({
      user_id: p.userId,
      project_id: typeof p.projectId === "string" ? p.projectId : null,
      kind: typeof p.kind === "string" ? p.kind : "system",
      title: p.title,
      body: typeof p.body === "string" ? p.body : "",
      action_url: typeof p.actionUrl === "string" ? p.actionUrl : null,
      metadata: typeof p.metadata === "object" && p.metadata ? p.metadata : {},
    });
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown platform job type: ${job.job_type}`);
}

export async function runPlatformWorker(admin: SupabaseClient, workerId: string, limit = 10) {
  const { data, error } = await admin.rpc("claim_platform_jobs", { p_worker: workerId, p_limit: limit });
  if (error) throw new Error(`Could not claim platform jobs: ${error.message}`);

  let succeeded = 0;
  let failed = 0;
  for (const raw of data ?? []) {
    const job = raw as Job;
    try {
      await executeJob(admin, job);
      const { error: doneError } = await admin.from("platform_jobs").update({
        status: "succeeded", completed_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null,
      }).eq("id", job.id);
      if (doneError) throw doneError;
      succeeded++;
    } catch (cause) {
      failed++;
      await failPlatformJob(admin, job, cause);
      platformLog.error("job.failed", { jobId: job.id, jobType: job.job_type, attempt: job.attempts });
    }
  }
  platformLog.info("worker.completed", { workerId, claimed: (data ?? []).length, succeeded, failed });
  return { claimed: (data ?? []).length, succeeded, failed };
}

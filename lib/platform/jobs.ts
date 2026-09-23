import type { SupabaseClient } from "@supabase/supabase-js";

type Job = { id: string; job_type: string; attempts: number; max_attempts: number };

/** Mark a platform job as failed, with exponential backoff for retry. */
export async function failPlatformJob(
  admin: SupabaseClient,
  job: Job,
  cause: unknown,
): Promise<void> {
  const errorMessage = cause instanceof Error ? cause.message : String(cause);
  const willRetry = job.attempts < job.max_attempts;
  const nextAttemptDelay = willRetry ? Math.pow(2, job.attempts) * 1000 : 0; // exponential backoff in ms
  const retryAfter = willRetry
    ? new Date(Date.now() + nextAttemptDelay).toISOString()
    : null;

  await admin.from("platform_jobs").update({
    status: willRetry ? "pending" : "failed",
    last_error: errorMessage,
    locked_at: null,
    locked_by: null,
    ...(retryAfter ? { run_after: retryAfter } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformJobInput = {
  type: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  runAfter?: string;
  maxAttempts?: number;
  priority?: number;
};

export async function enqueuePlatformJob(admin: SupabaseClient, input: PlatformJobInput) {
  if (!input.type.trim()) throw new Error("job type required");
  const row = {
    job_type: input.type,
    payload: input.payload ?? {},
    idempotency_key: input.idempotencyKey ?? null,
    run_after: input.runAfter ?? new Date().toISOString(),
    max_attempts: input.maxAttempts ?? 5,
    priority: input.priority ?? 100,
  };
  const { data, error } = await admin.from("platform_jobs").upsert(row, {
    onConflict: "idempotency_key",
    ignoreDuplicates: true,
  }).select("id, status").maybeSingle();
  if (error) throw new Error(`Could not enqueue platform job: ${error.message}`);
  return data;
}

export function retryDelaySeconds(attempt: number): number {
  const safeAttempt = Math.max(1, Math.min(attempt, 10));
  return Math.min(3600, 15 * 2 ** (safeAttempt - 1));
}

export async function failPlatformJob(admin: SupabaseClient, job: { id: string; attempts: number; max_attempts: number }, error: unknown) {
  const dead = job.attempts >= job.max_attempts;
  const runAfter = new Date(Date.now() + retryDelaySeconds(job.attempts) * 1000).toISOString();
  const { error: updateError } = await admin.from("platform_jobs").update({
    status: dead ? "dead" : "failed",
    last_error: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    locked_at: null,
    locked_by: null,
    run_after: runAfter,
    completed_at: dead ? new Date().toISOString() : null,
  }).eq("id", job.id);
  if (updateError) throw updateError;
}

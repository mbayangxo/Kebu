import type { SupabaseClient } from "@supabase/supabase-js";

export type CronJobName = "billing-monthly" | "site-health" | "shop-subscriptions";

export async function recordPlatformCronRun(
  supabase: SupabaseClient,
  opts: {
    jobName: CronJobName | string;
    status: "ok" | "error" | "partial";
    startedAt: Date;
    summary?: Record<string, unknown>;
    errorMessage?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("platform_cron_runs").insert({
      job_name: opts.jobName,
      status: opts.status,
      summary: opts.summary ?? {},
      error_message: opts.errorMessage ?? null,
      started_at: opts.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch {
    /* never fail the cron because logging failed */
  }
}

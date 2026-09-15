import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import { processEmailFlows } from "@/lib/email/automation-flows";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * E2 — process due email flow enrollments.
 * Runs hourly. Sends the current step's email, advances to the next step.
 * Call with Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase service credentials missing." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date();

  const result = await processEmailFlows(supabase);

  const status =
    result.failed > 0
      ? result.sent === 0 && result.completed === 0
        ? "error"
        : "partial"
      : "ok";

  await recordPlatformCronRun(supabase, {
    jobName: "process-email-flows",
    status,
    startedAt,
    summary: result,
    errorMessage: result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
  });

  return NextResponse.json({ ok: true, ...result });
}

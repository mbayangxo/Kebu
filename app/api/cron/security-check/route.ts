import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";
import { auditSecuritySecrets } from "@/lib/platform/security-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily security posture summary — set CRON_SECRET and call from Vercel Cron. Does not fix anything; surfaces what the admin portal should already show. */
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

  const { missingSecrets, weakSecrets } = auditSecuritySecrets(process.env as Record<string, string | undefined>);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await supabase
    .from("security_events")
    .select("event_type")
    .gte("created_at", dayAgo);

  const tableMissing = Boolean(error?.message?.includes("security_events"));
  const counts: Record<string, number> = {};
  for (const row of events ?? []) {
    const type = (row as { event_type: string }).event_type;
    counts[type] = (counts[type] ?? 0) + 1;
  }

  const summary = {
    missingSecrets,
    weakSecrets,
    signalsLast24h: counts,
    securityEventsTableMissing: tableMissing,
  };

  const status =
    missingSecrets.length > 0 || weakSecrets.length > 0 ? "error" : tableMissing ? "partial" : "ok";

  await recordPlatformCronRun(supabase, {
    jobName: "security-check",
    status,
    startedAt,
    summary,
    errorMessage:
      missingSecrets.length > 0
        ? `Missing required secrets: ${missingSecrets.join(", ")}`
        : weakSecrets.length > 0
          ? `Weak/placeholder secrets: ${weakSecrets.join(", ")}`
          : null,
  });

  return NextResponse.json({ ok: status === "ok", ...summary });
}

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPlatformWorker } from "@/lib/platform/worker";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  const startedAt = new Date();
  const admin = createAdminClient();
  try {
    const result = await runPlatformWorker(admin, `vercel:${randomUUID()}`, 25);
    await recordPlatformCronRun(admin, { jobName: "platform-worker", status: result.failed ? "partial" : "ok", startedAt, summary: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPlatformCronRun(admin, { jobName: "platform-worker", status: "error", startedAt, errorMessage: message });
    return NextResponse.json({ ok: false, error: "Worker execution failed." }, { status: 500 });
  }
}

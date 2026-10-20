import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPlatformWorker } from "@/lib/platform/worker";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";
import { reconcileOrphanedDigitalFulfillments } from "@/lib/shop/digital-downloads";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  const startedAt = new Date();
  const admin = createAdminClient();
  try {
    // Backfill first: covers a request process that died after payment
    // confirmation but before ever enqueuing/attempting fulfillment, so this
    // run's claim below can pick up anything it finds.
    const reconciled = await reconcileOrphanedDigitalFulfillments(admin);
    const result = await runPlatformWorker(admin, `vercel:${randomUUID()}`, 25);
    await recordPlatformCronRun(admin, { jobName: "platform-worker", status: result.failed ? "partial" : "ok", startedAt, summary: { ...result, reconciled } });
    return NextResponse.json({ ok: true, ...result, reconciled });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPlatformCronRun(admin, { jobName: "platform-worker", status: "error", startedAt, errorMessage: message });
    return NextResponse.json({ ok: false, error: "Worker execution failed." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireCronSecret } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { runPlatformWorker } from "@/lib/platform/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const guard = requireCronSecret(req);
  if (guard) return guard;

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const workerId = randomUUID();
  try {
    const result = await runPlatformWorker(admin, workerId, 20);
    return NextResponse.json({ ok: true, workerId, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

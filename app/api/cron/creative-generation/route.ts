import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { advanceCreativeGeneration } from "@/lib/generation/engine";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req); if (denied) return denied;
  const admin = createServiceClient(); if (!admin) return NextResponse.json({ error: "Worker unavailable." }, { status: 503 });
  try { const run = await advanceCreativeGeneration(admin); return NextResponse.json({ ok: true, runId: run?.id ?? null }); }
  catch { return NextResponse.json({ error: "Could not confirm generation work." }, { status: 503 }); }
}

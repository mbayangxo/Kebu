import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPhaseOneSearchIndex } from "@/lib/search/indexer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  try {
    const result = await refreshPhaseOneSearchIndex(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Search indexing failed." }, { status: 500 });
  }
}

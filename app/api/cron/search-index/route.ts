import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPhaseOneSearchIndex } from "@/lib/search/indexer";
import { refreshBusinessSearchIndex } from "@/lib/search/business-index";
import { refreshProductsSearchIndex } from "@/lib/search/products-index";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const [phaseOne, businesses, products] = await Promise.all([
      refreshPhaseOneSearchIndex(admin),
      refreshBusinessSearchIndex(admin),
      refreshProductsSearchIndex(admin),
    ]);
    return NextResponse.json({ ok: true, ...phaseOne, ...businesses, products });
  } catch {
    return NextResponse.json({ ok: false, error: "Search indexing failed." }, { status: 500 });
  }
}

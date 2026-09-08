import { NextResponse } from "next/server";
import { assertAdminPassword, createServiceClient } from "@/lib/opportunity/admin";
import { CURATED_OPPORTUNITY_SEED } from "@/lib/opportunity/curated-listings";
import { opportunityToDbRow } from "@/lib/opportunity/listings";

export const dynamic = "force-dynamic";

/**
 * Admin-only seed: upsert curated opportunity listings into `opportunities`.
 * Header: x-admin-password: $ADMIN_PASSWORD
 */
export async function POST(req: Request) {
  if (!assertAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY required for seed." }, { status: 503 });
  }

  let upserted = 0;
  const errors: string[] = [];

  for (const opp of CURATED_OPPORTUNITY_SEED) {
    const row = opportunityToDbRow(opp);
    const { error } = await service.from("opportunities").upsert(row, { onConflict: "id" });
    if (error) errors.push(`${opp.id}: ${error.message}`);
    else upserted += 1;
  }

  return NextResponse.json({
    upserted,
    total: CURATED_OPPORTUNITY_SEED.length,
    errors,
    note: "Curated listings only. Run after migration 001 (+ optional 060 metadata).",
  });
}

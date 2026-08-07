import { NextResponse } from "next/server";
import { assertAdminPassword, createServiceClient } from "@/lib/opportunity/admin";
import { profileToDbRow } from "@/lib/opportunity/country-schema";
import { COUNTRY_PROFILES } from "@/lib/data/country-profiles";

export const dynamic = "force-dynamic";

/**
 * Admin-only seed: upsert curated COUNTRY_PROFILES into country_profiles.
 * Header: x-admin-password: $ADMIN_PASSWORD
 */
export async function POST(req: Request) {
  if (!assertAdminPassword(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required for seed." },
      { status: 503 }
    );
  }

  let upserted = 0;
  const errors: string[] = [];

  for (const profile of COUNTRY_PROFILES) {
    const row = profileToDbRow(profile);
    const { error } = await service.from("country_profiles").upsert(row, {
      onConflict: "country_code",
    });
    if (error) errors.push(`${profile.country_code}: ${error.message}`);
    else upserted += 1;
  }

  return NextResponse.json({
    upserted,
    total: COUNTRY_PROFILES.length,
    errors,
    note: "Seeded curated profiles. AI analyses are not created by this endpoint.",
  });
}

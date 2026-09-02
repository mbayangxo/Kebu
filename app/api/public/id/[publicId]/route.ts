import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { isPublicAfriqueIdFormat } from "@/lib/afrique-id/public-id";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public trust card — only for verified Afrique IDs. */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = raw.trim().toUpperCase();

  if (!isPublicAfriqueIdFormat(publicId)) {
    return NextResponse.json({ error: "Invalid Afrique ID format." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: afrique } = await admin
    .from("afrique_ids")
    .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at")
    .eq("public_afrique_id", publicId)
    .eq("eligibility_status", "verified")
    .maybeSingle();

  if (!afrique) {
    return NextResponse.json({ error: "Profile not found or not verified." }, { status: 404 });
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("name, avatar_url")
    .eq("id", afrique.user_id)
    .maybeSingle();

  return NextResponse.json({
    card: {
      publicAfriqueId: afrique.public_afrique_id,
      displayName: profile?.name ?? "Kebu member",
      countryCode: afrique.country_code,
      eligibilityStatus: "verified" as const,
      avatarUrl: profile?.avatar_url ?? null,
      verifiedAt: afrique.verified_at,
    },
    trustLabel: "Verified personal identity on Kebu (Afrique ID). Not a business Kebu ID.",
  });
}

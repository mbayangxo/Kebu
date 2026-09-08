import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { isPublicAfricanIdFormat, normalizePublicAfricanId } from "@/lib/afrique-id/public-id";
import { africanIdProductName, africanIdTypeLabel, parseAfricanIdType } from "@/lib/afrique-id/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public trust card — only for verified African IDs (AID). */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = normalizePublicAfricanId(raw);

  if (!isPublicAfricanIdFormat(publicId)) {
    return NextResponse.json({ error: "Invalid African ID format." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: afrique } = await admin
    .from("afrique_ids")
    .select("user_id, public_afrique_id, country_code, eligibility_status, verified_at, identity_type")
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

  const identityType = parseAfricanIdType(afrique.identity_type);

  return NextResponse.json({
    card: {
      publicAfriqueId: afrique.public_afrique_id,
      publicAfricanId: afrique.public_afrique_id,
      displayName: profile?.name ?? "Kebu member",
      countryCode: afrique.country_code,
      identityType,
      identityTypeLabel: africanIdTypeLabel(identityType),
      eligibilityStatus: "verified" as const,
      avatarUrl: profile?.avatar_url ?? null,
      verifiedAt: afrique.verified_at,
    },
    trustLabel: `Verified personal identity on Kebu (${africanIdProductName()} / AID). Not a business Kebu ID.`,
  });
}

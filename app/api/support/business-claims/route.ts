import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveSupportAuthorization } from "@/lib/create/support-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import { BUSINESS_CLAIM_DOCUMENTS_BUCKET } from "@/lib/kebu-id/business-claims";

export const dynamic = "force-dynamic";

async function requireClaimsAdmin() {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };
  const service = createServiceClient();
  if (!service) {
    return { error: NextResponse.json({ error: "Service database client unavailable." }, { status: 503 }) };
  }
  let authorization;
  try {
    authorization = await resolveSupportAuthorization(service, auth.user);
  } catch {
    return { error: NextResponse.json({ error: "Could not verify admin authorization." }, { status: 503 }) };
  }
  if (!authorization || !["admin", "support"].includes(authorization.role)) {
    return { error: NextResponse.json({ error: "Only Kebu platform admins can review business claims." }, { status: 403 }) };
  }
  return { service, userId: auth.user.id, role: authorization.role };
}

/** All pending business-ownership claims, newest first, with a signed proof-document link. */
export async function GET() {
  const auth = await requireClaimsAdmin();
  if ("error" in auth) return auth.error;
  const { service } = auth;

  const { data: claims, error } = await service
    .from("business_claims")
    .select(
      "id, business_id, claimant_user_id, note, proof_storage_path, proof_file_name, status, reviewed_at, review_reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Could not load claims.", detail: error.message }, { status: 500 });
  }

  const businessIds = [...new Set((claims ?? []).map((c) => c.business_id))];
  const { data: businesses } = businessIds.length
    ? await service.from("businesses").select("id, legal_name, public_kebu_id").in("id", businessIds)
    : { data: [] as { id: string; legal_name: string; public_kebu_id: string }[] };
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  const withUrls = await Promise.all(
    (claims ?? []).map(async (claim) => {
      const { data: signed } = await service.storage
        .from(BUSINESS_CLAIM_DOCUMENTS_BUCKET)
        .createSignedUrl(claim.proof_storage_path, 3600);
      const business = businessById.get(claim.business_id) ?? null;
      return {
        ...claim,
        businesses: business ? { legal_name: business.legal_name, public_kebu_id: business.public_kebu_id } : null,
        proofDownloadUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ claims: withUrls });
}

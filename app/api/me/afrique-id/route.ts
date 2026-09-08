import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  ensureAfriqueIdForUser,
  updateAfricanIdType,
} from "@/lib/afrique-id/ensure-afrique-id";
import {
  africanIdProductName,
  africanIdShortName,
  africanIdTypeLabel,
  eligibilityStatusLabel,
  parseAfricanIdType,
} from "@/lib/afrique-id/types";

export const dynamic = "force-dynamic";

function serializeAid(afriqueId: {
  publicAfriqueId: string;
  countryCode: string;
  identityType: "indigenous" | "visitor";
  eligibilityStatus: string;
  verifiedAt: string | null;
  createdAt: string;
}) {
  return {
    publicId: afriqueId.publicAfriqueId,
    countryCode: afriqueId.countryCode,
    identityType: afriqueId.identityType,
    identityTypeLabel: africanIdTypeLabel(afriqueId.identityType),
    eligibilityStatus: afriqueId.eligibilityStatus,
    eligibilityLabel: eligibilityStatusLabel(
      afriqueId.eligibilityStatus as Parameters<typeof eligibilityStatusLabel>[0],
    ),
    verifiedAt: afriqueId.verifiedAt,
    createdAt: afriqueId.createdAt,
    publicProfilePath: `/id/${afriqueId.publicAfriqueId.toLowerCase()}`,
    productName: africanIdProductName(),
    shortName: africanIdShortName(),
  };
}

/** Personal African ID (AID) linked to this Kebu account. Auto-created on first load. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("residence_country, name, diaspora_status")
    .eq("id", user.id)
    .maybeSingle();

  const ensured = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
    countryCode: profile?.residence_country ?? null,
  });

  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.error }, { status: 500 });
  }

  const { afriqueId, created } = ensured;

  return NextResponse.json({
    africanId: serializeAid(afriqueId),
    /** @deprecated use africanId */
    afriqueId: serializeAid(afriqueId),
    created,
    note: `${africanIdProductName()} (${africanIdShortName()}) is your personal identity on Kebu. Choose Indigenous African or Visitor. Kebu ID is for businesses — keep them separate.`,
  });
}

/** Set African ID type: indigenous | visitor */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = (await req.json().catch(() => ({}))) as { identityType?: string };
  if (body.identityType !== "indigenous" && body.identityType !== "visitor") {
    return NextResponse.json(
      { error: "identityType must be \"indigenous\" or \"visitor\"." },
      { status: 400 },
    );
  }

  const ensured = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
  });
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.error }, { status: 500 });
  }

  const updated = await updateAfricanIdType({
    supabase,
    userId: user.id,
    identityType: parseAfricanIdType(body.identityType),
  });
  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: updated.status ?? 500 });
  }

  return NextResponse.json({
    ok: true,
    africanId: serializeAid(updated.afriqueId),
    afriqueId: serializeAid(updated.afriqueId),
    message: `Saved as ${africanIdTypeLabel(updated.afriqueId.identityType)}.`,
  });
}

/** Request eligibility verification review (sets pending — server/admin verifies later). */
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, residence_country, diaspora_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.name?.trim()) {
    return NextResponse.json(
      { error: "Add your name on your account page before requesting verification." },
      { status: 400 },
    );
  }

  const ensured = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
    countryCode: profile.residence_country,
  });
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.error }, { status: 500 });
  }

  const current = ensured.afriqueId.eligibilityStatus;
  if (current === "verified") {
    return NextResponse.json({
      ok: true,
      message: "You are already verified.",
      africanId: serializeAid(ensured.afriqueId),
      afriqueId: serializeAid(ensured.afriqueId),
    });
  }
  if (current === "pending" || current === "manual_review") {
    return NextResponse.json({ ok: true, message: "Your verification is already in review." });
  }

  const { data: updated, error } = await supabase
    .from("afrique_ids")
    .update({ eligibility_status: "pending", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("eligibility_status", ["unverified", "rejected", "expired"])
    .select("public_afrique_id, eligibility_status, identity_type")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not submit verification request." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Submitted for review. We will verify your ${africanIdProductName()} — you cannot set verified status yourself.`,
    eligibilityStatus: updated.eligibility_status,
  });
}

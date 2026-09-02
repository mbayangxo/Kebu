import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { ensureAfriqueIdForUser } from "@/lib/afrique-id/ensure-afrique-id";
import { eligibilityStatusLabel } from "@/lib/afrique-id/types";

export const dynamic = "force-dynamic";

/** Personal Afrique ID linked to this Kebu account. Auto-created on first load. */
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
    afriqueId: {
      publicId: afriqueId.publicAfriqueId,
      countryCode: afriqueId.countryCode,
      eligibilityStatus: afriqueId.eligibilityStatus,
      eligibilityLabel: eligibilityStatusLabel(afriqueId.eligibilityStatus),
      verifiedAt: afriqueId.verifiedAt,
      createdAt: afriqueId.createdAt,
      publicProfilePath: `/id/${afriqueId.publicAfriqueId.toLowerCase()}`,
    },
    created,
    note:
      "Afrique ID is your personal identity on Kebu. Kebu ID is for businesses — keep them separate.",
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
    return NextResponse.json({ ok: true, message: "You are already verified.", afriqueId: ensured.afriqueId });
  }
  if (current === "pending" || current === "manual_review") {
    return NextResponse.json({ ok: true, message: "Your verification is already in review." });
  }

  const { data: updated, error } = await supabase
    .from("afrique_ids")
    .update({ eligibility_status: "pending", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("eligibility_status", ["unverified", "rejected", "expired"])
    .select("public_afrique_id, eligibility_status")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not submit verification request." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Submitted for review. We will verify your Afrique ID — you cannot set verified status yourself.",
    eligibilityStatus: updated.eligibility_status,
  });
}

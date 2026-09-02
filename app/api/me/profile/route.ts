import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { meProfilePatchSchema, rowToMeProfile } from "@/lib/account/user-profile";
import { ensureAfriqueIdForUser } from "@/lib/afrique-id/ensure-afrique-id";
import { eligibilityStatusLabel } from "@/lib/afrique-id/types";

export const dynamic = "force-dynamic";

/** Load signed-in personal account profile. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, name, email, avatar_url, residence_country, business_stage, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }

  const base = rowToMeProfile(
    data ?? {
      id: user.id,
      email: user.email ?? null,
      name: (user as { user_metadata?: { name?: string } }).user_metadata?.name ?? null,
    },
  );

  const ensured = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
    countryCode: data?.residence_country ?? null,
  });

  const profile = {
    ...base,
    afriqueId: ensured.ok
      ? {
          publicId: ensured.afriqueId.publicAfriqueId,
          eligibilityStatus: ensured.afriqueId.eligibilityStatus,
          eligibilityLabel: eligibilityStatusLabel(ensured.afriqueId.eligibilityStatus),
          publicProfilePath: `/id/${ensured.afriqueId.publicAfriqueId.toLowerCase()}`,
        }
      : null,
  };

  return NextResponse.json({ profile });
}

/** Update personal profile fields (not avatar — use /api/me/avatar). */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = meProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.residenceCountry !== undefined) patch.residence_country = parsed.data.residenceCountry;
  if (parsed.data.businessStage !== undefined) patch.business_stage = parsed.data.businessStage;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id, name, email, avatar_url, residence_country, business_stage, onboarding_complete")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("avatar_url") ? "Apply migration 025." : "Could not save profile." },
      { status: 500 },
    );
  }

  const ensured = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
    countryCode: data.residence_country,
  });

  const profile = {
    ...rowToMeProfile(data),
    afriqueId: ensured.ok
      ? {
          publicId: ensured.afriqueId.publicAfriqueId,
          eligibilityStatus: ensured.afriqueId.eligibilityStatus,
          eligibilityLabel: eligibilityStatusLabel(ensured.afriqueId.eligibilityStatus),
          publicProfilePath: `/id/${ensured.afriqueId.publicAfriqueId.toLowerCase()}`,
        }
      : null,
  };

  return NextResponse.json({ profile });
}

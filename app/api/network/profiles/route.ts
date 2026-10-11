import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { DIRECTORY_FIELDS, networkProfileSubmission, type NetworkProfileInput } from "@/lib/network/profile";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function authenticationFailure(response: NextResponse) {
  const signedOut = response.status === 401;
  return NextResponse.json({ error: signedOut ? "Sign in required."
    : "The network is temporarily unavailable. Please retry." },
  { status: signedOut ? 401 : 503, headers });
}

/** Member directory: session-scoped client, explicit public-profile fields, RLS retained. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return authenticationFailure(auth.error);
  try {
    const { data, error } = await auth.supabase.from("network_profiles")
      .select(DIRECTORY_FIELDS).eq("is_visible", true)
      .order("joined_at", { ascending: false }).order("id", { ascending: false }).limit(501);
    if (error) return NextResponse.json({ error: "Could not load members. Please retry." }, { status: 503, headers });
    const profiles = (data ?? []).slice(0, 500).map(profile => ({
      ...profile, looking_for: profile.looking_for ?? [], languages: profile.languages ?? [],
    }));
    return NextResponse.json({ profiles, hasMore: (data?.length ?? 0) > 500 }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not load members. Please retry." }, { status: 503, headers });
  }
}

/** Only the authenticated identity may create a profile; never accept ownership/trust flags. */
export async function POST(req: Request) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;
  const auth = await requireUser();
  if ("error" in auth) return authenticationFailure(auth.error);
  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 16000) return NextResponse.json({ error: "Profile is too long." }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400, headers });
  }
  const parsed = networkProfileSubmission.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the required fields and profile lengths." }, { status: 400, headers });
  try {
    const { submission_id, ...profile } = parsed.data;
    const { data, error } = await auth.supabase.from("network_profiles")
      .insert({ ...profile, id: submission_id, user_id: auth.user.id, is_visible: true })
      .select("id").single();
    if (error?.code === "23505") {
      const { data: saved, error: readError } = await auth.supabase.from("network_profiles")
        .select(DIRECTORY_FIELDS).eq("id", submission_id).eq("user_id", auth.user.id).single();
      if (readError) return NextResponse.json({ error: "Could not confirm the earlier save. Check the network before retrying." }, { status: 503, headers });
      if (!saved || Object.entries(profile).some(([field, value]) =>
        JSON.stringify(saved[field as keyof NetworkProfileInput]) !== JSON.stringify(value))) {
        return NextResponse.json({ error: "This save attempt does not match a confirmed profile. Check your saved profile before submitting again." }, { status: 409, headers });
      }
      return NextResponse.json({ profile: { id: saved.id } }, { status: 200, headers });
    }
    if (error || !data?.id) {
      return NextResponse.json({ error: "Your profile was not confirmed saved. Your draft is still here; check the network before retrying." }, { status: 503, headers });
    }
    return NextResponse.json({ profile: { id: data.id } }, { status: 201, headers });
  } catch {
    return NextResponse.json({ error: "Your profile was not confirmed saved. Your draft is still here; check the network before retrying." }, { status: 503, headers });
  }
}

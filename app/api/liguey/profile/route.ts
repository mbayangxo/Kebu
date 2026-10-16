import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { rowToWorkerProfile, updateWorkerProfileSchema, type WorkerProfileRow } from "@/lib/liguey/worker-profile";

export const dynamic = "force-dynamic";

const PROFILE_COLUMNS = "user_id, headline, bio, skills, languages, experience, location, country_code, remote_eligible, availability, is_discoverable, verified_at, created_at, updated_at";

/** Load the signed-in worker's Liguey profile, lazily creating one on first touch. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: existing, error: readError } = await supabase
    .from("worker_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Could not load your Liguey profile." }, { status: 503 });
  if (existing) return NextResponse.json({ profile: rowToWorkerProfile(existing as WorkerProfileRow) });

  const { data: created, error: createError } = await supabase
    .from("worker_profiles")
    .insert({ user_id: user.id })
    .select(PROFILE_COLUMNS)
    .single();
  if (createError === null && created) return NextResponse.json({ profile: rowToWorkerProfile(created as WorkerProfileRow) });
  if (createError?.code === "23505") {
    const { data: retried } = await supabase.from("worker_profiles").select(PROFILE_COLUMNS).eq("user_id", user.id).maybeSingle();
    if (retried) return NextResponse.json({ profile: rowToWorkerProfile(retried as WorkerProfileRow) });
  }
  return NextResponse.json({ error: "Could not create your Liguey profile." }, { status: 500 });
}

export async function PATCH(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = updateWorkerProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile.", issues: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.headline !== undefined) patch.headline = parsed.data.headline;
  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio;
  if (parsed.data.skills !== undefined) patch.skills = parsed.data.skills;
  if (parsed.data.languages !== undefined) patch.languages = parsed.data.languages;
  if (parsed.data.experience !== undefined) patch.experience = parsed.data.experience;
  if (parsed.data.location !== undefined) patch.location = parsed.data.location;
  if (parsed.data.countryCode !== undefined) patch.country_code = parsed.data.countryCode;
  if (parsed.data.remoteEligible !== undefined) patch.remote_eligible = parsed.data.remoteEligible;
  if (parsed.data.availability !== undefined) patch.availability = parsed.data.availability;
  if (parsed.data.isDiscoverable !== undefined) patch.is_discoverable = parsed.data.isDiscoverable;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error } = await supabase
    .from("worker_profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update your Liguey profile." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Create your Liguey profile before updating it." }, { status: 404 });
  return NextResponse.json({ profile: rowToWorkerProfile(data as WorkerProfileRow) });
}

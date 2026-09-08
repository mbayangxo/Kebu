import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  opportunityId: z.string().min(1).max(128),
  status: z.enum(["saved", "applying", "submitted", "won", "rejected"]).optional(),
  notes: z.string().max(2000).optional(),
});

async function ensureUserProfile(
  supabase: { from: (table: string) => unknown },
  user: { id: string; email?: string | null; user_metadata?: { name?: string } },
) {
  const { data: existing } = await supabase.from("user_profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return true;

  const { error } = await supabase.from("user_profiles").insert({
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.name ?? null,
  });

  return !error;
}

/** Saved / tracked opportunity listings for the signed-in user. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("saved_opportunities")
    .select("id, opportunity_id, status, notes, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    const missing = error.message.includes("does not exist") || error.code === "42P01";
    return NextResponse.json(
      { error: missing ? "Saved opportunities table missing (migration 001)." : "Could not load saved listings." },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ saved: data ?? [] });
}

/** Save or update tracking status for a listing. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const profileOk = await ensureUserProfile(supabase, user);
  if (!profileOk) {
    return NextResponse.json({ error: "Could not ensure user profile." }, { status: 500 });
  }

  const { data: listing } = await supabase
    .from("opportunities")
    .select("id")
    .eq("id", parsed.data.opportunityId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("saved_opportunities")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", parsed.data.opportunityId)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

    const { data, error } = await supabase
      .from("saved_opportunities")
      .update(patch)
      .eq("id", existing.id)
      .select("id, opportunity_id, status, notes, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: "Could not update saved listing." }, { status: 500 });
    return NextResponse.json({ saved: data, updated: true });
  }

  const { data, error } = await supabase
    .from("saved_opportunities")
    .insert({
      user_id: user.id,
      opportunity_id: parsed.data.opportunityId,
      status: parsed.data.status ?? "saved",
      notes: parsed.data.notes ?? null,
    })
    .select("id, opportunity_id, status, notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save listing." }, { status: 500 });
  }

  return NextResponse.json({ saved: data, created: true });
}

/** Remove a saved listing. */
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const opportunityId = new URL(req.url).searchParams.get("opportunityId");
  if (!opportunityId) {
    return NextResponse.json({ error: "opportunityId query required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_opportunities")
    .delete()
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId);

  if (error) {
    return NextResponse.json({ error: "Could not remove saved listing." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

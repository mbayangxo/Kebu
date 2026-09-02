import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { b2bProfileSchema, rowToB2bProfile } from "@/lib/kebu-id/b2b-profile";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertCanManage(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string, userId: string) {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !["founder", "administrator", "store_manager"].includes(data.role)) {
    return false;
  }
  return true;
}

export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const canManage = await assertCanManage(supabase, businessId, user.id);
  if (!canManage) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_b2b_profiles")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 024." : "Could not load B2B profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    profile: data ? rowToB2bProfile(data as Parameters<typeof rowToB2bProfile>[0]) : null,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const canManage = await assertCanManage(supabase, businessId, user.id);
  if (!canManage) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = b2bProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const row = {
    business_id: businessId,
    headline: parsed.data.headline,
    about: parsed.data.about,
    logo_url: parsed.data.logoUrl,
    cover_url: parsed.data.coverUrl,
    gallery_urls: parsed.data.galleryUrls,
    categories: parsed.data.categories,
    min_order_note: parsed.data.minOrderNote,
    contact_email: parsed.data.contactEmail || null,
    contact_phone: parsed.data.contactPhone || null,
    is_published: parsed.data.isPublished ?? false,
  };

  const { data: existing } = await supabase
    .from("business_b2b_profiles")
    .select("business_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data, error } = existing
    ? await supabase.from("business_b2b_profiles").update(row).eq("business_id", businessId).select("*").single()
    : await supabase.from("business_b2b_profiles").insert(row).select("*").single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save B2B profile." }, { status: 500 });
  }

  await supabase.from("businesses").update({ commerce_mode: "both" }).eq("id", businessId);

  return NextResponse.json({ profile: rowToB2bProfile(data as Parameters<typeof rowToB2bProfile>[0]) });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("developer_apps")
    .select("id, name, tagline, category, pricing, price_xof, status, installs, created_at, updated_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  return NextResponse.json({ app: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Confirm ownership and editability
  const { data: existing, error: fetchErr } = await supabase
    .from("developer_apps")
    .select("id, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  if (existing.status === "published") {
    return NextResponse.json({ error: "Published apps cannot be edited." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.name === "string") {
    const name = b.name.trim();
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "App name must be 2–60 characters." }, { status: 400 });
    }
    updates.name = name;
  }

  if ("tagline" in b) {
    updates.tagline = typeof b.tagline === "string" ? b.tagline.trim() || null : null;
  }

  const validCategories = ["site_template", "business_tool", "mobile_money", "ai_plugin", "studio_template", "logistics"];
  if (typeof b.category === "string") {
    if (!validCategories.includes(b.category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    updates.category = b.category;
  }

  const validPricing = ["free", "paid", "recurring"];
  if (typeof b.pricing === "string") {
    if (!validPricing.includes(b.pricing)) {
      return NextResponse.json({ error: "Invalid pricing." }, { status: 400 });
    }
    updates.pricing = b.pricing;
  }

  if ("price_xof" in b) {
    updates.price_xof = typeof b.price_xof === "number" && b.price_xof > 0 ? b.price_xof : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("developer_apps")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, name, tagline, category, pricing, price_xof, status, installs, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not update app.", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ app: data });
}

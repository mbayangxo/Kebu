import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("developer_apps")
    .select("id, name, tagline, category, pricing, price_xof, status, installs, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("does not exist") || error.code === "42P01"
            ? "developer_apps table missing — apply the migration in Supabase."
            : "Could not load apps.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ apps: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const tagline = typeof b.tagline === "string" ? b.tagline.trim() || null : null;
  const category = typeof b.category === "string" ? b.category : "";
  const pricing = typeof b.pricing === "string" ? b.pricing : "";
  const price_xof =
    (pricing === "paid" || pricing === "recurring") && typeof b.price_xof === "number"
      ? b.price_xof
      : null;

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "App name must be 2–60 characters." }, { status: 400 });
  }

  const validCategories = ["site_template", "business_tool", "mobile_money", "ai_plugin", "studio_template", "logistics"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const validPricing = ["free", "paid", "recurring"];
  if (!validPricing.includes(pricing)) {
    return NextResponse.json({ error: "Invalid pricing." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("developer_apps")
    .insert({ owner_id: user.id, name, tagline, category, pricing, price_xof })
    .select("id, name, status")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not create app.", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ app: data }, { status: 201 });
}

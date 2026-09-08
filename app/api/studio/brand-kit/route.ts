import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { BRAND_KIT_SELECT, brandKitSchema } from "@/lib/studio/brand-kit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");

  let query = supabase
    .from("business_brand_kits")
    .select(BRAND_KIT_SELECT)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data: kits, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message?.includes("does not exist") ? "Apply migration 064." : "Could not load brand kit." },
      { status: 500 },
    );
  }

  return NextResponse.json({ kits: kits ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = brandKitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: kit, error } = await supabase
    .from("business_brand_kits")
    .insert({
      owner_id: user.id,
      business_id: parsed.data.businessId ?? null,
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl,
      primary_color: parsed.data.primaryColor,
      accent_color: parsed.data.accentColor,
      background_color: parsed.data.backgroundColor,
      text_color: parsed.data.textColor,
      font_display: parsed.data.fontDisplay,
      font_body: parsed.data.fontBody,
    })
    .select(BRAND_KIT_SELECT)
    .single();

  if (error || !kit) {
    return NextResponse.json({ error: "Could not save brand kit." }, { status: 500 });
  }

  return NextResponse.json({ kit });
}

const patchKitSchema = brandKitSchema.partial().extend({
  id: z.string().uuid().optional(),
});

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

  const parsed = patchKitSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Brand kit id required." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.logoUrl !== undefined) patch.logo_url = parsed.data.logoUrl;
  if (parsed.data.primaryColor !== undefined) patch.primary_color = parsed.data.primaryColor;
  if (parsed.data.accentColor !== undefined) patch.accent_color = parsed.data.accentColor;
  if (parsed.data.backgroundColor !== undefined) patch.background_color = parsed.data.backgroundColor;
  if (parsed.data.textColor !== undefined) patch.text_color = parsed.data.textColor;
  if (parsed.data.fontDisplay !== undefined) patch.font_display = parsed.data.fontDisplay;
  if (parsed.data.fontBody !== undefined) patch.font_body = parsed.data.fontBody;
  if (parsed.data.businessId !== undefined) patch.business_id = parsed.data.businessId;

  const { data: kit, error } = await supabase
    .from("business_brand_kits")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .select(BRAND_KIT_SELECT)
    .single();

  if (error || !kit) {
    return NextResponse.json({ error: "Could not update brand kit." }, { status: 404 });
  }

  return NextResponse.json({ kit });
}

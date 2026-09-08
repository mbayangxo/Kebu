import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  BRAND_DNA_SELECT,
  brandDnaSchema,
  rowToBrandDna,
} from "@/lib/studio/brand-dna";

export const dynamic = "force-dynamic";

/**
 * Brand DNA foundation — GET list / by business, POST create, PATCH update.
 * Stored on business_brand_kits with DNA columns (migration 076).
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  const id = url.searchParams.get("id");

  let query = supabase
    .from("business_brand_kits")
    .select(BRAND_DNA_SELECT)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (id) query = query.eq("id", id);
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 076_brand_dna_campaign_projects.sql (and 064 if brand kits missing)."
          : "Could not load Brand DNA.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const kits = (data ?? []).map((row) => rowToBrandDna(row as Record<string, unknown>));
  return NextResponse.json({ kits, dna: kits[0] ?? null });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = brandDnaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Brand DNA.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  if (d.businessId) {
    const { data: existing } = await supabase
      .from("business_brand_kits")
      .select("id")
      .eq("owner_id", user.id)
      .eq("business_id", d.businessId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json(
        { error: "Brand DNA already exists for this business. Use PATCH.", id: existing.id },
        { status: 409 },
      );
    }
  }

  const { data: kit, error } = await supabase
    .from("business_brand_kits")
    .insert({
      owner_id: user.id,
      business_id: d.businessId ?? null,
      name: d.name,
      logo_url: d.logoUrl,
      primary_color: d.primaryColor,
      accent_color: d.accentColor,
      background_color: d.backgroundColor,
      text_color: d.textColor,
      font_display: d.fontDisplay,
      font_body: d.fontBody,
      tagline: d.tagline,
      photography_style: d.photographyStyle,
      voice_tone: d.voiceTone,
      languages: d.languages,
      customer_notes: d.customerNotes,
      products_notes: d.productsNotes,
      visual_rules: d.visualRules,
      approved_imagery: d.approvedImagery,
      dna_version: 1,
    })
    .select(BRAND_DNA_SELECT)
    .single();

  if (error || !kit) {
    return NextResponse.json(
      {
        error:
          error?.message?.includes("does not exist") || error?.message?.includes("column")
            ? "Apply migration 076_brand_dna_campaign_projects.sql."
            : "Could not save Brand DNA.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ dna: rowToBrandDna(kit as Record<string, unknown>) });
}

const patchSchema = brandDnaSchema.partial().extend({
  id: z.string().uuid(),
});

export async function PATCH(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Brand DNA patch." }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (rest.name != null) patch.name = rest.name;
  if (rest.businessId !== undefined) patch.business_id = rest.businessId;
  if (rest.logoUrl != null) patch.logo_url = rest.logoUrl;
  if (rest.primaryColor != null) patch.primary_color = rest.primaryColor;
  if (rest.accentColor != null) patch.accent_color = rest.accentColor;
  if (rest.backgroundColor != null) patch.background_color = rest.backgroundColor;
  if (rest.textColor != null) patch.text_color = rest.textColor;
  if (rest.fontDisplay != null) patch.font_display = rest.fontDisplay;
  if (rest.fontBody != null) patch.font_body = rest.fontBody;
  if (rest.tagline != null) patch.tagline = rest.tagline;
  if (rest.photographyStyle != null) patch.photography_style = rest.photographyStyle;
  if (rest.voiceTone != null) patch.voice_tone = rest.voiceTone;
  if (rest.languages != null) patch.languages = rest.languages;
  if (rest.customerNotes != null) patch.customer_notes = rest.customerNotes;
  if (rest.productsNotes != null) patch.products_notes = rest.productsNotes;
  if (rest.visualRules != null) patch.visual_rules = rest.visualRules;
  if (rest.approvedImagery != null) patch.approved_imagery = rest.approvedImagery;

  const { data: current } = await supabase
    .from("business_brand_kits")
    .select("dna_version")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (current) {
    patch.dna_version = Math.min(100, (typeof current.dna_version === "number" ? current.dna_version : 1) + 1);
  }

  const { data: kit, error } = await supabase
    .from("business_brand_kits")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(BRAND_DNA_SELECT)
    .single();

  if (error || !kit) {
    return NextResponse.json({ error: "Could not update Brand DNA.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ dna: rowToBrandDna(kit as Record<string, unknown>) });
}

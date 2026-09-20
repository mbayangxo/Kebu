import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { BRAND_KIT_SELECT, brandKitSchema } from "@/lib/studio/brand-kit";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(req.url);
  const requestedBusinessId = url.searchParams.get("businessId");
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);
  if (requestedBusinessId && requestedBusinessId !== workspace.activeBusinessId) {
    return NextResponse.json({ error: "Switch to the Kebu space that owns this brand kit." }, { status: 409 });
  }

  let query = supabase
    .from("business_brand_kits")
    .select(BRAND_KIT_SELECT)
    .order("updated_at", { ascending: false });

  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null).eq("owner_id", user.id);

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
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
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

  const workspace = await loadActiveWorkspaceScope(supabase, user.id);
  const parsed = brandKitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }
  if ((parsed.data.businessId ?? null) !== workspace.activeBusinessId) {
    return NextResponse.json({ error: "Brand kit must be saved inside the active Kebu space." }, { status: 409 });
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
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const workspace = await loadActiveWorkspaceScope(supabase, user.id);
  const parsed = patchKitSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Brand kit id required." }, { status: 400 });
  }

  if (parsed.data.businessId !== undefined && (parsed.data.businessId ?? null) !== workspace.activeBusinessId) {
    return NextResponse.json({ error: "Brand kit cannot be moved outside the active Kebu space." }, { status: 409 });
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

  let updateQuery = supabase
    .from("business_brand_kits")
    .update(patch)
    .eq("id", parsed.data.id);
  updateQuery = workspace.activeBusinessId
    ? updateQuery.eq("business_id", workspace.activeBusinessId)
    : updateQuery.is("business_id", null).eq("owner_id", user.id);
  const { data: kit, error } = await updateQuery
    .select(BRAND_KIT_SELECT)
    .single();

  if (error || !kit) {
    return NextResponse.json({ error: "Could not update brand kit." }, { status: 404 });
  }

  return NextResponse.json({ kit });
}

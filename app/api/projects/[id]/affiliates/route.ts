import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { affiliateCodeInputSchema, getAffiliateAttribution } from "@/lib/shop/affiliates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List affiliate codes for an owned shop project, with real attributed orders/revenue per code. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const attribution = await getAffiliateAttribution(supabase, projectId);
  if (!attribution.ok) {
    return NextResponse.json(
      {
        error: attribution.error.includes("does not exist")
          ? "Affiliate codes need migration 20261103010000_shop_affiliate_codes.sql."
          : "Could not load affiliate codes.",
        detail: attribution.error,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ affiliates: attribution.items });
}

/** Create an affiliate code — attribution only, never changes order price. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = affiliateCodeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid affiliate code.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("shop_affiliate_codes")
    .insert({
      project_id: projectId,
      business_id: project.business_id,
      code: parsed.data.code,
      affiliate_name: parsed.data.affiliateName,
      commission_percent: parsed.data.commissionPercent ?? null,
      is_active: parsed.data.isActive ?? true,
      note: parsed.data.note || null,
    })
    .select("id, project_id, code, affiliate_name, commission_percent, is_active, uses_count, note, created_at")
    .single();

  if (error || !data) {
    logCreate("shop.affiliate_create_failed", { projectId, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("duplicate")
          ? "That code already exists on this shop."
          : error?.message?.includes("does not exist")
            ? "Apply migration 20261103010000_shop_affiliate_codes.sql."
            : "Could not save affiliate code.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  logCreate("shop.affiliate_created", { projectId, code: data.code });
  return NextResponse.json({ affiliate: data });
}

import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { discountCodeInputSchema } from "@/lib/shop/discounts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List discount codes for an owned shop project. */
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

  const { data, error } = await supabase
    .from("shop_discount_codes")
    .select(
      "id, project_id, code, percent_off, is_active, max_uses, uses_count, campaign_id, note, starts_at, ends_at, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Discount codes need migration 044. Apply APPLY_SHOP_ORDERS.sql in Supabase."
          : "Could not load discount codes.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ discounts: data ?? [] });
}

/** Create a % off discount code. */
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

  const parsed = discountCodeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid discount.", issues: parsed.error.flatten() }, { status: 400 });
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
    .from("shop_discount_codes")
    .insert({
      project_id: projectId,
      business_id: project.business_id,
      code: parsed.data.code,
      percent_off: parsed.data.percentOff,
      is_active: parsed.data.isActive ?? true,
      max_uses: parsed.data.maxUses ?? null,
      note: parsed.data.note || null,
      campaign_id: parsed.data.campaignId ?? null,
    })
    .select(
      "id, project_id, code, percent_off, is_active, max_uses, uses_count, campaign_id, note, starts_at, ends_at, created_at",
    )
    .single();

  if (error || !data) {
    logCreate("shop.discount_create_failed", { projectId, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("duplicate")
          ? "That code already exists on this shop."
          : error?.message?.includes("does not exist")
            ? "Apply migration 044 (APPLY_SHOP_ORDERS.sql)."
            : "Could not save discount code.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  logCreate("shop.discount_created", { projectId, code: data.code });
  return NextResponse.json({ discount: data });
}

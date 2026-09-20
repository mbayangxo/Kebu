import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import {
  CAMPAIGN_SELECT,
  campaignProjectSchema,
  rowToCampaign,
} from "@/lib/studio/campaign-project";

export const dynamic = "force-dynamic";

/** List / create Creative Director campaign projects. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let query = supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .order("updated_at", { ascending: false })
    .limit(48);
  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 076_brand_dna_campaign_projects.sql."
          : "Could not load campaigns.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    campaigns: (data ?? []).map((r) => rowToCampaign(r as Record<string, unknown>)),
  });
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

  const parsed = campaignProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);
  if (d.businessId !== undefined && (d.businessId ?? null) !== workspace.activeBusinessId) {
    return NextResponse.json(
      { error: "Campaigns can only be created inside the current Kebu space." },
      { status: 409 },
    );
  }

  if (d.brandKitId) {
    let kitQuery = supabase
      .from("business_brand_kits")
      .select("id, business_id")
      .eq("id", d.brandKitId);
    kitQuery = workspace.activeBusinessId
      ? kitQuery.eq("business_id", workspace.activeBusinessId)
      : kitQuery.is("business_id", null);
    const { data: kit } = await kitQuery.maybeSingle();
    if (!kit) {
      return NextResponse.json(
        { error: "That Brand DNA kit does not belong to the current Kebu space." },
        { status: 403 },
      );
    }
  }

  const { data: row, error } = await supabase
    .from("studio_campaign_projects")
    .insert({
      owner_id: user.id,
      business_id: workspace.activeBusinessId,
      brand_kit_id: d.brandKitId ?? null,
      title: d.title,
      brief: d.brief,
      goal: d.goal,
      status: d.status,
      mood: d.mood,
      design_ids: [],
      video_project_ids: [],
      meta: {},
    })
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !row) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Apply migration 076_brand_dna_campaign_projects.sql."
          : "Could not create campaign.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ campaign: rowToCampaign(row as Record<string, unknown>) });
}

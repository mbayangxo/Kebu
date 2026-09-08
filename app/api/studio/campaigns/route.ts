import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
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

  const { data, error } = await supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(48);

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
  const { data: row, error } = await supabase
    .from("studio_campaign_projects")
    .insert({
      owner_id: user.id,
      business_id: d.businessId ?? null,
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

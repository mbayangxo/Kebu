import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  CAMPAIGN_SELECT,
  campaignMoodSchema,
  moodChangeMeta,
  parseCampaignMood,
  rowToCampaign,
} from "@/lib/studio/campaign-project";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const campaign = rowToCampaign(data as Record<string, unknown>);
  let designs: { id: string; title: string; design_type: string; updated_at: string }[] = [];
  if (campaign.design_ids.length) {
    const { data: designRows } = await supabase
      .from("create_designs")
      .select("id, title, design_type, updated_at")
      .eq("owner_id", user.id)
      .in("id", campaign.design_ids);
    designs = designRows ?? [];
  }

  return NextResponse.json({ campaign, designs });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  brief: z.string().trim().max(2000).optional(),
  goal: z.string().trim().max(400).optional(),
  status: z.enum(["draft", "active", "launched", "archived"]).optional(),
  brandKitId: z.string().uuid().nullable().optional(),
  businessId: z.string().uuid().nullable().optional(),
  mood: campaignMoodSchema.partial().optional(),
  designIds: z.array(z.string().uuid()).max(40).optional(),
  videoProjectIds: z.array(z.string().uuid()).max(20).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign patch." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const prev = rowToCampaign(existing as Record<string, unknown>);
  const nextMood = parsed.data.mood
    ? parseCampaignMood({ ...prev.mood, ...parsed.data.mood })
    : prev.mood;
  const meta = {
    ...prev.meta,
    ...moodChangeMeta(prev.mood, nextMood),
  };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    meta,
  };
  if (parsed.data.title != null) patch.title = parsed.data.title;
  if (parsed.data.brief != null) patch.brief = parsed.data.brief;
  if (parsed.data.goal != null) patch.goal = parsed.data.goal;
  if (parsed.data.status != null) patch.status = parsed.data.status;
  if (parsed.data.brandKitId !== undefined) patch.brand_kit_id = parsed.data.brandKitId;
  if (parsed.data.businessId !== undefined) patch.business_id = parsed.data.businessId;
  if (parsed.data.mood) patch.mood = nextMood;
  if (parsed.data.designIds) patch.design_ids = parsed.data.designIds;
  if (parsed.data.videoProjectIds) patch.video_project_ids = parsed.data.videoProjectIds;

  const { data: row, error } = await supabase
    .from("studio_campaign_projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Could not update campaign." }, { status: 500 });
  }

  return NextResponse.json({ campaign: rowToCampaign(row as Record<string, unknown>) });
}

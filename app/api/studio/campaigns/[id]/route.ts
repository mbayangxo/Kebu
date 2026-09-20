import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
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
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let campaignQuery = supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("id", id);
  campaignQuery = workspace.activeBusinessId
    ? campaignQuery.eq("business_id", workspace.activeBusinessId)
    : campaignQuery.is("business_id", null);
  const { data, error } = await campaignQuery.maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const campaign = rowToCampaign(data as Record<string, unknown>);
  let designs: { id: string; title: string; design_type: string; updated_at: string }[] = [];
  if (campaign.design_ids.length) {
    const { data: designRows } = await supabase
      .from("create_designs")
      .select("id, title, design_type, updated_at")
      .in("id", campaign.design_ids)
      .eq("business_id", campaign.business_id as string);
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
  mood: campaignMoodSchema.partial().optional(),
  designIds: z.array(z.string().uuid()).max(40).optional(),
  videoProjectIds: z.array(z.string().uuid()).max(20).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

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

  let existingQuery = supabase
    .from("studio_campaign_projects")
    .select(CAMPAIGN_SELECT)
    .eq("id", id);
  existingQuery = workspace.activeBusinessId
    ? existingQuery.eq("business_id", workspace.activeBusinessId)
    : existingQuery.is("business_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

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
  if (parsed.data.mood) patch.mood = nextMood;
  if (parsed.data.designIds) patch.design_ids = parsed.data.designIds;
  if (parsed.data.videoProjectIds) patch.video_project_ids = parsed.data.videoProjectIds;

  let updateQuery = supabase
    .from("studio_campaign_projects")
    .update(patch)
    .eq("id", id);
  updateQuery = workspace.activeBusinessId
    ? updateQuery.eq("business_id", workspace.activeBusinessId)
    : updateQuery.is("business_id", null);
  const { data: row, error } = await updateQuery
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Could not update campaign." }, { status: 500 });
  }

  return NextResponse.json({ campaign: rowToCampaign(row as Record<string, unknown>) });
}

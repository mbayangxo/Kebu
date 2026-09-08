import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  isAllowedDestinationUrl,
  patchReachCampaignSchema,
  summarizeReachEvents,
} from "@/lib/reach/campaigns";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: campaign, error } = await supabase
    .from("reach_campaigns")
    .select(
      "id, title, status, public_slug, destination_url, design_id, project_id, business_id, creative_note, budget_note, board_enabled, bid_cpc_cauris, budget_cap_cauris, spent_cauris, creative_headline, creative_image_url, created_at, updated_at",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const { data: events } = await supabase
    .from("reach_campaign_events")
    .select("event_type, created_at, device, referrer")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    campaign: {
      ...campaign,
      promotePath: `/r/${campaign.public_slug}`,
      stats: summarizeReachEvents(events ?? []),
    },
    recentEvents: events ?? [],
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = patchReachCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.destinationUrl && !isAllowedDestinationUrl(parsed.data.destinationUrl)) {
    return NextResponse.json({ error: "Invalid destination URL." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.destinationUrl !== undefined) patch.destination_url = parsed.data.destinationUrl.trim();
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.creativeNote !== undefined) patch.creative_note = parsed.data.creativeNote;
  if (parsed.data.budgetNote !== undefined) patch.budget_note = parsed.data.budgetNote;
  if (parsed.data.boardEnabled !== undefined) patch.board_enabled = parsed.data.boardEnabled;
  if (parsed.data.bidCpcCauris !== undefined) patch.bid_cpc_cauris = parsed.data.bidCpcCauris;
  if (parsed.data.budgetCapCauris !== undefined) patch.budget_cap_cauris = parsed.data.budgetCapCauris;
  if (parsed.data.creativeHeadline !== undefined) patch.creative_headline = parsed.data.creativeHeadline;
  if (parsed.data.creativeImageUrl !== undefined) {
    patch.creative_image_url = parsed.data.creativeImageUrl || null;
  }

  const { data: campaign, error } = await supabase
    .from("reach_campaigns")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(
      "id, title, status, public_slug, destination_url, design_id, project_id, business_id, creative_note, budget_note, board_enabled, bid_cpc_cauris, budget_cap_cauris, spent_cauris, creative_headline, creative_image_url, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !campaign) {
    return NextResponse.json(
      {
        error: error?.message?.includes("board_enabled")
          ? "Paid board fields missing. Apply migration 074."
          : "Could not update campaign.",
      },
      { status: error?.message?.includes("board_enabled") ? 503 : 500 },
    );
  }

  return NextResponse.json({
    campaign: { ...campaign, promotePath: `/r/${campaign.public_slug}` },
  });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  createReachCampaignSchema,
  isAllowedDestinationUrl,
  newReachSlug,
  summarizeReachEvents,
} from "@/lib/reach/campaigns";

export const dynamic = "force-dynamic";

/** List owner's Reach campaigns + event counts. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: campaigns, error } = await supabase
    .from("reach_campaigns")
    .select(
      "id, title, status, public_slug, destination_url, design_id, project_id, business_id, creative_note, budget_note, board_enabled, bid_cpc_cauris, budget_cap_cauris, spent_cauris, creative_headline, creative_image_url, created_at, updated_at",
    )
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Reach table missing. Apply migration 072."
          : "Could not load campaigns.",
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  const ids = (campaigns ?? []).map((c) => c.id as string);
  const counts = new Map<
    string,
    { opens: number; clicks: number; shares: number; impressions: number; boardClicks: number }
  >();
  if (ids.length) {
    const { data: events } = await supabase
      .from("reach_campaign_events")
      .select("campaign_id, event_type")
      .in("campaign_id", ids);
    const byCampaign = new Map<string, { event_type: string }[]>();
    for (const e of events ?? []) {
      const id = e.campaign_id as string;
      const list = byCampaign.get(id) ?? [];
      list.push({ event_type: e.event_type as string });
      byCampaign.set(id, list);
    }
    for (const [id, list] of byCampaign) {
      counts.set(id, summarizeReachEvents(list));
    }
  }

  return NextResponse.json({
    campaigns: (campaigns ?? []).map((c) => ({
      ...c,
      stats: counts.get(c.id as string) ?? {
        opens: 0,
        clicks: 0,
        shares: 0,
        impressions: 0,
        boardClicks: 0,
      },
      promotePath: `/r/${c.public_slug}`,
      boardPath: "/reach/board",
    })),
  });
}

/** Create Reach campaign from Studio / Reach home (tracked promote link). */
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

  const parsed = createReachCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign input." }, { status: 400 });
  }

  if (!isAllowedDestinationUrl(parsed.data.destinationUrl)) {
    return NextResponse.json(
      { error: "Destination must be an http(s) URL or a path starting with /." },
      { status: 400 },
    );
  }

  if (parsed.data.designId) {
    const { data: design } = await supabase
      .from("create_designs")
      .select("id")
      .eq("id", parsed.data.designId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!design) {
      return NextResponse.json({ error: "Design not found." }, { status: 404 });
    }
  }

  if (parsed.data.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "Shop / site project not found." }, { status: 404 });
    }
  }

  let slug = newReachSlug();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from("reach_campaigns")
      .select("id")
      .eq("public_slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = newReachSlug();
  }

  const status = parsed.data.activate ? "active" : "draft";

  const { data: campaign, error } = await supabase
    .from("reach_campaigns")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      destination_url: parsed.data.destinationUrl.trim(),
      design_id: parsed.data.designId ?? null,
      project_id: parsed.data.projectId ?? null,
      business_id: parsed.data.businessId ?? null,
      creative_note: parsed.data.creativeNote ?? null,
      budget_note: parsed.data.budgetNote ?? null,
      public_slug: slug,
      status,
    })
    .select(
      "id, title, status, public_slug, destination_url, design_id, project_id, business_id, creative_note, budget_note, created_at, updated_at",
    )
    .single();

  if (error || !campaign) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Reach table missing. Apply migration 072."
          : error?.message ?? "Could not create campaign.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    campaign: {
      ...campaign,
      promotePath: `/r/${campaign.public_slug}`,
      stats: { opens: 0, clicks: 0, shares: 0, impressions: 0, boardClicks: 0 },
    },
  });
}

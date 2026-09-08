import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { REACH_EVENT_TYPES } from "@/lib/reach/campaigns";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const eventSchema = z.object({
  eventType: z.enum(REACH_EVENT_TYPES),
  referrer: z.string().trim().max(500).optional().nullable(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional().nullable(),
});

/** Public campaign payload for /r/[slug] (active/paused only show destination). */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Reach not configured." }, { status: 503 });
  }

  const { data: campaign } = await service
    .from("reach_campaigns")
    .select("id, title, status, public_slug, destination_url, creative_note, design_id")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.status === "archived" || campaign.status === "draft") {
    return NextResponse.json({ error: "This promote link is not live yet." }, { status: 404 });
  }

  return NextResponse.json({
    campaign: {
      title: campaign.title,
      status: campaign.status,
      slug: campaign.public_slug,
      destinationUrl: campaign.status === "paused" ? null : campaign.destination_url,
      creativeNote: campaign.creative_note,
      paused: campaign.status === "paused",
    },
  });
}

/** Record open / click / share — service role ingest. */
export async function POST(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { slug } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Reach not configured." }, { status: 503 });
  }

  const { data: campaign } = await service
    .from("reach_campaigns")
    .select("id, status")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!campaign || campaign.status === "archived" || campaign.status === "draft") {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.status === "paused" && parsed.data.eventType === "click") {
    return NextResponse.json({ error: "Campaign paused." }, { status: 403 });
  }

  const { error } = await service.from("reach_campaign_events").insert({
    campaign_id: campaign.id,
    event_type: parsed.data.eventType,
    referrer: parsed.data.referrer ?? null,
    device: parsed.data.device ?? null,
    meta: {},
  });

  if (error) {
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

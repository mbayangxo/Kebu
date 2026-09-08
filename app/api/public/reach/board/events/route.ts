import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { chargeBoardClickCpc } from "@/lib/reach/wallet";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  campaignId: z.string().uuid(),
  eventType: z.enum(["impression", "board_click"]),
  /** Client session key for light impression dedupe */
  sessionKey: z.string().trim().min(8).max(64).optional().nullable(),
  /** Required for impression: fraction visible 0–1 when fired */
  visibleRatio: z.number().min(0.5).max(1).optional().nullable(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});

/**
 * Record board impression (viewable only) or board_click (CPC charge).
 * Never invent counts — client must have shown the creative.
 */
export async function POST(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid board event." }, { status: 400 });
  }

  if (parsed.data.eventType === "impression") {
    const ratio = parsed.data.visibleRatio ?? 0;
    if (ratio < 0.5) {
      return NextResponse.json(
        { error: "Impression requires ≥50% visible. No invented impressions." },
        { status: 400 },
      );
    }
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Reach not configured." }, { status: 503 });
  }

  const { data: campaign } = await service
    .from("reach_campaigns")
    .select(
      "id, owner_id, status, board_enabled, bid_cpc_cauris, budget_cap_cauris, spent_cauris, public_slug, destination_url",
    )
    .eq("id", parsed.data.campaignId)
    .maybeSingle();

  if (
    !campaign ||
    campaign.status !== "active" ||
    !campaign.board_enabled
  ) {
    return NextResponse.json({ error: "Campaign not on board." }, { status: 404 });
  }

  if (parsed.data.eventType === "impression" && parsed.data.sessionKey) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: prior } = await service
      .from("reach_campaign_events")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("event_type", "impression")
      .gte("created_at", since)
      .contains("meta", { sessionKey: parsed.data.sessionKey })
      .limit(1)
      .maybeSingle();
    if (prior) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  let charged: number | undefined;
  if (parsed.data.eventType === "board_click") {
    const result = await chargeBoardClickCpc(service, {
      ownerId: campaign.owner_id as string,
      campaignId: campaign.id as string,
      bidCpc: Number(campaign.bid_cpc_cauris),
      budgetCap: Number(campaign.budget_cap_cauris),
      spent: Number(campaign.spent_cauris),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 402 });
    }
    charged = result.charged;
  }

  const { error } = await service.from("reach_campaign_events").insert({
    campaign_id: campaign.id,
    event_type: parsed.data.eventType,
    referrer: parsed.data.referrer ?? null,
    device: parsed.data.device ?? null,
    meta: {
      inventory: "reach_board",
      sessionKey: parsed.data.sessionKey ?? null,
      visibleRatio: parsed.data.visibleRatio ?? null,
      chargedCauris: charged ?? null,
    },
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("impression")
          ? "Event types missing. Apply migration 074."
          : "Could not record event.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    chargedCauris: charged ?? 0,
    destinationUrl:
      parsed.data.eventType === "board_click" ? (campaign.destination_url as string) : undefined,
  });
}

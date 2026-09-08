import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { rankBoardAuction, type ReachAuctionCandidate } from "@/lib/reach/auction";
import { getReachWalletBalance } from "@/lib/reach/wallet";
import type { ReachCampaignStatus } from "@/lib/reach/campaigns";

export const dynamic = "force-dynamic";

/** Public Reach Board — auction winners only (S10b). No invented fill. */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Reach board not configured." }, { status: 503 });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitParam) ? Math.min(24, Math.max(1, Math.round(limitParam))) : 12;

  const { data: rows, error } = await service
    .from("reach_campaigns")
    .select(
      "id, owner_id, title, public_slug, destination_url, status, board_enabled, bid_cpc_cauris, budget_cap_cauris, spent_cauris, creative_headline, creative_image_url, creative_note",
    )
    .eq("status", "active")
    .eq("board_enabled", true)
    .gt("bid_cpc_cauris", 0)
    .order("bid_cpc_cauris", { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("board_enabled")
          ? "Paid board missing. Apply migration 074."
          : "Could not load board.",
        creatives: [],
      },
      { status: error.message?.includes("board_enabled") ? 503 : 500 },
    );
  }

  const candidates = (rows ?? []).map(
    (r): ReachAuctionCandidate => ({
      id: r.id as string,
      owner_id: r.owner_id as string,
      title: r.title as string,
      public_slug: r.public_slug as string,
      destination_url: r.destination_url as string,
      status: r.status as ReachCampaignStatus,
      board_enabled: Boolean(r.board_enabled),
      bid_cpc_cauris: Number(r.bid_cpc_cauris ?? 0),
      budget_cap_cauris: Number(r.budget_cap_cauris ?? 0),
      spent_cauris: Number(r.spent_cauris ?? 0),
      creative_headline: (r.creative_headline as string | null) ?? null,
      creative_image_url: (r.creative_image_url as string | null) ?? null,
      creative_note: (r.creative_note as string | null) ?? null,
    }),
  );

  const ownerIds = [...new Set(candidates.map((c) => c.owner_id))];
  const walletByOwner = new Map<string, number>();
  for (const oid of ownerIds) {
    walletByOwner.set(oid, await getReachWalletBalance(service, oid));
  }

  const creatives = rankBoardAuction(candidates, walletByOwner, limit);

  return NextResponse.json({
    creatives,
    inventory: "reach_board",
    honestNote:
      "Only campaigns that won the CPC auction appear. Empty board = no eligible paid campaigns — never padded with fake ads.",
  });
}

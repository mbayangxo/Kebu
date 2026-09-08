import type { ReachCampaignStatus } from "@/lib/reach/campaigns";

/** Campaign row fields needed for board auction (S10b). */
export type ReachAuctionCandidate = {
  id: string;
  owner_id: string;
  title: string;
  public_slug: string;
  destination_url: string;
  status: ReachCampaignStatus;
  board_enabled: boolean;
  bid_cpc_cauris: number;
  budget_cap_cauris: number;
  spent_cauris: number;
  creative_headline: string | null;
  creative_image_url: string | null;
  creative_note: string | null;
};

export type ReachBoardCreative = {
  campaignId: string;
  slug: string;
  title: string;
  headline: string;
  note: string | null;
  imageUrl: string | null;
  bidCpc: number;
  promotePath: string;
};

export function remainingBudget(c: {
  budget_cap_cauris: number;
  spent_cauris: number;
}): number {
  return Math.max(0, roundCauris(c.budget_cap_cauris - c.spent_cauris));
}

export function isEligibleForBoardAuction(
  c: ReachAuctionCandidate,
  ownerWalletBalance: number,
): boolean {
  if (c.status !== "active" || !c.board_enabled) return false;
  if (c.bid_cpc_cauris <= 0) return false;
  if (remainingBudget(c) < c.bid_cpc_cauris) return false;
  if (ownerWalletBalance < c.bid_cpc_cauris) return false;
  return true;
}

/**
 * First-price CPC auction: highest bid wins rank.
 * Tie-break: lower spent (fairness), then title.
 */
export function rankBoardAuction(
  candidates: ReachAuctionCandidate[],
  walletByOwner: Map<string, number>,
  limit = 12,
): ReachBoardCreative[] {
  const eligible = candidates.filter((c) =>
    isEligibleForBoardAuction(c, walletByOwner.get(c.owner_id) ?? 0),
  );

  eligible.sort((a, b) => {
    if (b.bid_cpc_cauris !== a.bid_cpc_cauris) return b.bid_cpc_cauris - a.bid_cpc_cauris;
    if (a.spent_cauris !== b.spent_cauris) return a.spent_cauris - b.spent_cauris;
    return a.title.localeCompare(b.title);
  });

  return eligible.slice(0, Math.max(1, Math.min(50, limit))).map((c) => ({
    campaignId: c.id,
    slug: c.public_slug,
    title: c.title,
    headline: (c.creative_headline?.trim() || c.title).slice(0, 120),
    note: c.creative_note,
    imageUrl: c.creative_image_url,
    bidCpc: c.bid_cpc_cauris,
    promotePath: `/r/${c.public_slug}`,
  }));
}

export function roundCauris(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

/** Max single top-up of platform Reach credits (S10b — not card charge). */
export const REACH_TOPUP_MAX_CAURIS = 500;

export const REACH_BID_MIN = 0.1;
export const REACH_BID_MAX = 100;

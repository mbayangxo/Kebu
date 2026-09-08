import { describe, expect, it } from "vitest";
import {
  isAllowedDestinationUrl,
  newReachSlug,
  summarizeReachEvents,
  reachStatusLabel,
} from "@/lib/reach/campaigns";
import {
  isEligibleForBoardAuction,
  rankBoardAuction,
  remainingBudget,
  type ReachAuctionCandidate,
} from "@/lib/reach/auction";

describe("Reach S10a helpers", () => {
  it("allows https and relative destinations", () => {
    expect(isAllowedDestinationUrl("https://shop.example.com/x")).toBe(true);
    expect(isAllowedDestinationUrl("/shop/abc")).toBe(true);
    expect(isAllowedDestinationUrl("//evil.com")).toBe(false);
    expect(isAllowedDestinationUrl("javascript:alert(1)")).toBe(false);
  });

  it("builds short public slugs", () => {
    const s = newReachSlug();
    expect(s.startsWith("r")).toBe(true);
    expect(s.length).toBeGreaterThanOrEqual(7);
  });

  it("summarizes real events only — including board", () => {
    expect(
      summarizeReachEvents([
        { event_type: "open" },
        { event_type: "open" },
        { event_type: "click" },
        { event_type: "share" },
        { event_type: "impression" },
        { event_type: "impression" },
        { event_type: "board_click" },
      ]),
    ).toEqual({ opens: 2, clicks: 1, shares: 1, impressions: 2, boardClicks: 1 });
  });

  it("labels statuses honestly", () => {
    expect(reachStatusLabel("active")).toBe("Active");
    expect(reachStatusLabel("draft")).toBe("Draft");
  });
});

function candidate(partial: Partial<ReachAuctionCandidate> & { id: string }): ReachAuctionCandidate {
  return {
    owner_id: "owner-a",
    title: "Ad",
    public_slug: "rtest01",
    destination_url: "https://example.com",
    status: "active",
    board_enabled: true,
    bid_cpc_cauris: 1,
    budget_cap_cauris: 10,
    spent_cauris: 0,
    creative_headline: null,
    creative_image_url: null,
    creative_note: null,
    ...partial,
  };
}

describe("Reach S10b auction — no invented fill", () => {
  it("rejects ineligible campaigns", () => {
    expect(isEligibleForBoardAuction(candidate({ id: "1", bid_cpc_cauris: 0 }), 100)).toBe(false);
    expect(isEligibleForBoardAuction(candidate({ id: "1", board_enabled: false }), 100)).toBe(false);
    expect(isEligibleForBoardAuction(candidate({ id: "1", spent_cauris: 10 }), 100)).toBe(false);
    expect(isEligibleForBoardAuction(candidate({ id: "1" }), 0.05)).toBe(false);
    expect(isEligibleForBoardAuction(candidate({ id: "1" }), 5)).toBe(true);
  });

  it("ranks by CPC bid and does not invent creatives", () => {
    const wallets = new Map([["owner-a", 50]]);
    const ranked = rankBoardAuction(
      [
        candidate({ id: "low", title: "Low", bid_cpc_cauris: 0.5, public_slug: "rlow" }),
        candidate({ id: "high", title: "High", bid_cpc_cauris: 3, public_slug: "rhigh" }),
        candidate({ id: "off", title: "Off", board_enabled: false, bid_cpc_cauris: 99 }),
      ],
      wallets,
      12,
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.campaignId).toBe("high");
    expect(ranked[1]!.campaignId).toBe("low");
  });

  it("computes remaining budget", () => {
    expect(remainingBudget({ budget_cap_cauris: 20, spent_cauris: 7.5 })).toBe(12.5);
  });
});

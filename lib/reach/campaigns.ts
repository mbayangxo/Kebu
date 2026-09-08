import { z } from "zod";

export const REACH_CAMPAIGN_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type ReachCampaignStatus = (typeof REACH_CAMPAIGN_STATUSES)[number];

export const REACH_EVENT_TYPES = ["open", "click", "share", "impression", "board_click"] as const;
export type ReachEventType = (typeof REACH_EVENT_TYPES)[number];

export function newReachSlug(): string {
  return `r${Math.random().toString(36).slice(2, 10)}`;
}

/** Allow https URLs or relative kebu paths starting with / */
export function isAllowedDestinationUrl(url: string): boolean {
  const t = url.trim();
  if (t.startsWith("/") && !t.startsWith("//") && t.length <= 500) return true;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export const createReachCampaignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  destinationUrl: z.string().trim().min(8).max(500),
  designId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  businessId: z.string().uuid().optional().nullable(),
  creativeNote: z.string().trim().max(500).optional().nullable(),
  budgetNote: z.string().trim().max(200).optional().nullable(),
  /** Start as active tracked link immediately */
  activate: z.boolean().optional().default(true),
});

export const patchReachCampaignSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  destinationUrl: z.string().trim().min(8).max(500).optional(),
  status: z.enum(REACH_CAMPAIGN_STATUSES).optional(),
  creativeNote: z.string().trim().max(500).optional().nullable(),
  budgetNote: z.string().trim().max(200).optional().nullable(),
  /** S10b paid board */
  boardEnabled: z.boolean().optional(),
  bidCpcCauris: z.number().min(0.1).max(100).optional(),
  budgetCapCauris: z.number().min(0).max(1_000_000).optional(),
  creativeHeadline: z.string().trim().max(120).optional().nullable(),
  creativeImageUrl: z
    .union([z.literal(""), z.string().trim().url().max(500)])
    .optional()
    .nullable(),
});

export function reachPromotePath(slug: string): string {
  return `/r/${slug}`;
}

export function summarizeReachEvents(
  events: { event_type: string }[],
): {
  opens: number;
  clicks: number;
  shares: number;
  impressions: number;
  boardClicks: number;
} {
  let opens = 0;
  let clicks = 0;
  let shares = 0;
  let impressions = 0;
  let boardClicks = 0;
  for (const e of events) {
    if (e.event_type === "open") opens += 1;
    else if (e.event_type === "click") clicks += 1;
    else if (e.event_type === "share") shares += 1;
    else if (e.event_type === "impression") impressions += 1;
    else if (e.event_type === "board_click") boardClicks += 1;
  }
  return { opens, clicks, shares, impressions, boardClicks };
}

export function reachStatusLabel(status: ReachCampaignStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "archived":
      return "Archived";
  }
}

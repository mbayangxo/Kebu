import { z } from "zod";
import type { BrandDnaRow } from "@/lib/studio/brand-dna";
import { brandDnaPromptBlock } from "@/lib/studio/brand-dna";
import {
  generateStudioDesignPack,
  type StudioGeneratedDesign,
} from "@/lib/studio/ai-generate";

export const campaignMoodSchema = z.object({
  direction: z.string().trim().max(800).default(""),
  keywords: z.array(z.string().trim().max(40)).max(20).default([]),
  primaryColor: z.string().trim().max(40).optional(),
  accentColor: z.string().trim().max(40).optional(),
  backgroundColor: z.string().trim().max(40).optional(),
  fontDisplay: z.string().trim().max(80).optional(),
  moodboardNotes: z.string().trim().max(1000).default(""),
});

export type CampaignMood = z.infer<typeof campaignMoodSchema>;

export const campaignProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  brief: z.string().trim().max(2000).default(""),
  goal: z.string().trim().max(400).default(""),
  businessId: z.string().uuid().nullable().optional(),
  brandKitId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "active", "launched", "archived"]).default("draft"),
  mood: campaignMoodSchema.default({}),
});

export type CampaignProjectInput = z.infer<typeof campaignProjectSchema>;

export type StudioCampaignProjectRow = {
  id: string;
  owner_id: string;
  business_id: string | null;
  brand_kit_id: string | null;
  title: string;
  brief: string;
  goal: string;
  status: "draft" | "active" | "launched" | "archived";
  mood: CampaignMood;
  design_ids: string[];
  video_project_ids: string[];
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const CAMPAIGN_SELECT =
  "id, owner_id, business_id, brand_kit_id, title, brief, goal, status, mood, design_ids, video_project_ids, meta, created_at, updated_at";

export function parseCampaignMood(raw: unknown): CampaignMood {
  const parsed = campaignMoodSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : campaignMoodSchema.parse({});
}

export function rowToCampaign(row: Record<string, unknown>): StudioCampaignProjectRow {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    business_id: (row.business_id as string | null) ?? null,
    brand_kit_id: (row.brand_kit_id as string | null) ?? null,
    title: String(row.title ?? "Campaign"),
    brief: String(row.brief ?? ""),
    goal: String(row.goal ?? ""),
    status: (["draft", "active", "launched", "archived"].includes(String(row.status))
      ? row.status
      : "draft") as StudioCampaignProjectRow["status"],
    mood: parseCampaignMood(row.mood),
    design_ids: Array.isArray(row.design_ids)
      ? (row.design_ids as unknown[]).map(String).filter(Boolean)
      : [],
    video_project_ids: Array.isArray(row.video_project_ids)
      ? (row.video_project_ids as unknown[]).map(String).filter(Boolean)
      : [],
    meta:
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

/** Build Creative Director pack prompt from campaign + Brand DNA. */
export function creativeDirectorPrompt(opts: {
  campaign: Pick<StudioCampaignProjectRow, "title" | "brief" | "goal" | "mood">;
  dna?: BrandDnaRow | null;
}): string {
  const mood = opts.campaign.mood;
  const parts = [
    `Campaign: ${opts.campaign.title}`,
    opts.campaign.goal ? `Goal: ${opts.campaign.goal}` : "",
    opts.campaign.brief ? `Brief: ${opts.campaign.brief}` : "",
    mood.direction ? `Visual direction: ${mood.direction}` : "",
    mood.keywords?.length ? `Keywords: ${mood.keywords.join(", ")}` : "",
    mood.moodboardNotes ? `Moodboard: ${mood.moodboardNotes}` : "",
    brandDnaPromptBlock(opts.dna ?? null),
    "Create a connected campaign pack: social post, story, and poster that share one visual system.",
  ].filter(Boolean);
  return parts.join("\n");
}

export async function generateCampaignDesignPack(opts: {
  campaign: Pick<StudioCampaignProjectRow, "title" | "brief" | "goal" | "mood">;
  dna?: BrandDnaRow | null;
}): Promise<{ designs: StudioGeneratedDesign[]; usedAi: boolean; fallback: boolean }> {
  const mood = opts.campaign.mood;
  const prompt = creativeDirectorPrompt(opts);
  return generateStudioDesignPack({
    prompt,
    businessName: opts.dna?.name ?? opts.campaign.title,
    primaryColor: mood.primaryColor ?? opts.dna?.primary_color,
    accentColor: mood.accentColor ?? opts.dna?.accent_color,
    backgroundColor: mood.backgroundColor ?? opts.dna?.background_color,
    creationMode: "create_for_me",
  });
}

/** When mood direction changes, bump meta for clients to refresh linked assets. */
export function moodChangeMeta(
  prev: CampaignMood,
  next: CampaignMood,
): Record<string, unknown> {
  const changed =
    prev.direction !== next.direction ||
    prev.primaryColor !== next.primaryColor ||
    prev.accentColor !== next.accentColor ||
    JSON.stringify(prev.keywords) !== JSON.stringify(next.keywords);
  return changed
    ? { directionUpdatedAt: new Date().toISOString(), needsAssetRefresh: true }
    : {};
}

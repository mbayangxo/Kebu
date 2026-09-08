import { z } from "zod";

const channelEnum = z.enum([
  "instagram",
  "tiktok",
  "youtube",
  "radio",
  "press",
  "email",
  "whatsapp",
  "live",
  "other",
]);

export const campaignChannelsSchema = z.array(channelEnum).max(12).default([]);

export function newCampaignPublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "cmp_";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export const createArtistCampaignSchema = z.object({
  artistId: z.string().uuid(),
  pressKitId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().max(400).optional().default(""),
  brief: z.string().trim().max(4000).optional().default(""),
  status: z
    .enum(["draft", "active", "paused", "done", "archived"])
    .optional()
    .default("draft"),
  channels: campaignChannelsSchema.optional(),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const updateArtistCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  objective: z.string().trim().max(400).optional(),
  brief: z.string().trim().max(4000).optional(),
  status: z.enum(["draft", "active", "paused", "done", "archived"]).optional(),
  channels: campaignChannelsSchema.optional(),
  pressKitId: z.string().uuid().optional().nullable(),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const CAMPAIGN_CHANNEL_LABELS: Record<z.infer<typeof channelEnum>, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  radio: "Radio",
  press: "Press",
  email: "Email",
  whatsapp: "WhatsApp",
  live: "Live / show",
  other: "Other",
};

import { z } from "zod";

const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      v === "" ||
      v.startsWith("/") ||
      v.startsWith("https://") ||
      v.startsWith("http://"),
    { message: "Invalid URL" },
  );

export const mediaKindSchema = z.enum([
  "reel",
  "music_video",
  "teaser",
  "live_clip",
  "other",
]);

export const mediaPlatformSchema = z.enum([
  "youtube",
  "instagram",
  "tiktok",
  "vimeo",
  "direct",
  "other",
]);

export const MEDIA_KIND_LABELS: Record<z.infer<typeof mediaKindSchema>, string> = {
  reel: "Reel",
  music_video: "Music video",
  teaser: "Teaser",
  live_clip: "Live clip",
  other: "Other",
};

export const MEDIA_PLATFORM_LABELS: Record<z.infer<typeof mediaPlatformSchema>, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  direct: "Direct video",
  other: "Other",
};

export function newMediaPublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "med_";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function inferPlatformFromUrl(url: string): z.infer<typeof mediaPlatformSchema> {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("vimeo.com")) return "vimeo";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return "direct";
  return "other";
}

export const createArtistMediaSchema = z.object({
  artistId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  kind: mediaKindSchema.optional().default("reel"),
  platform: mediaPlatformSchema.optional(),
  title: z.string().trim().min(1).max(160),
  url: safeUrl.refine((v) => v.length >= 8, { message: "URL required" }),
  thumbnailUrl: safeUrl.optional().default(""),
  caption: z.string().trim().max(500).optional().default(""),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

export const updateArtistMediaSchema = z.object({
  mediaId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  kind: mediaKindSchema.optional(),
  platform: mediaPlatformSchema.optional(),
  title: z.string().trim().min(1).max(160).optional(),
  url: safeUrl.optional(),
  thumbnailUrl: safeUrl.optional(),
  caption: z.string().trim().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

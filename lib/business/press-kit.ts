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

export function newPressPublicId(prefix: "art" | "kit"): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = `${prefix}_`;
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function slugifyArtistName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  if (!slug) return "artist";
  if (slug.length < 2) return `${slug}0`;
  return slug;
}

export const socialLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: safeUrl,
});

export const kitQuoteSchema = z.object({
  quote: z.string().trim().min(1).max(500),
  source: z.string().trim().max(120).default(""),
});

export const kitFactSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
});

export const kitAssetSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: safeUrl,
  kind: z.enum(["photo", "video", "audio", "pdf", "other"]).default("photo"),
  caption: z.string().trim().max(200).optional().default(""),
});

/** Structured electronic press kit body — editable JSON, not free HTML. */
export const pressKitBodySchema = z.object({
  headline: z.string().trim().max(160).default(""),
  bio: z.string().trim().max(8000).default(""),
  bookingEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  bookingPhone: z.string().trim().max(24).default(""),
  quotes: z.array(kitQuoteSchema).max(12).default([]),
  facts: z.array(kitFactSchema).max(16).default([]),
  assets: z.array(kitAssetSchema).max(24).default([]),
});

export type PressKitBody = z.infer<typeof pressKitBodySchema>;

export const createArtistSchema = z.object({
  stageName: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(160).optional().default(""),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(60)
    .optional(),
  bioShort: z.string().trim().max(400).optional().default(""),
  hometown: z.string().trim().max(120).optional().default(""),
  genres: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
  socialLinks: z.array(socialLinkSchema).max(12).optional().default([]),
  portraitUrl: safeUrl.optional().default(""),
  coverUrl: safeUrl.optional().default(""),
  status: z.enum(["draft", "active", "archived"]).optional().default("draft"),
});

export const upsertPressKitSchema = z.object({
  artistId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  kit: pressKitBodySchema.optional(),
});

export const updatePressKitSchema = z.object({
  kitId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  kit: pressKitBodySchema.optional(),
});

export function pressKitPublicPath(publicId: string): string {
  return `/k/${encodeURIComponent(publicId)}`;
}

export function artistPublicPath(publicId: string): string {
  return `/a/${encodeURIComponent(publicId)}`;
}

export function defaultPressKitBody(stageName: string): PressKitBody {
  return {
    headline: `${stageName} — Press kit`,
    bio: `Short approved bio for ${stageName}. Replace with the official paragraph journalists can paste.`,
    bookingEmail: "",
    bookingPhone: "",
    quotes: [
      {
        quote: "Add a real press quote with permission.",
        source: "Outlet name",
      },
    ],
    facts: [
      { label: "Based in", value: "Dakar" },
      { label: "Genre", value: "Edit me" },
    ],
    assets: [],
  };
}

export function parsePressKitBody(raw: unknown): PressKitBody {
  const parsed = pressKitBodySchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultPressKitBody("Artist");
}

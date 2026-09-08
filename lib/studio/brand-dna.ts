import { z } from "zod";
import type { BrandKitRow } from "@/lib/studio/brand-kit";

const imageUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(500),
  z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[a-zA-Z0-9._\-/]+$/),
]);

/** Brand DNA — permanent per-business creative identity (extends brand kit). */
export const brandDnaSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Brand DNA"),
  businessId: z.string().uuid().nullable().optional(),
  logoUrl: imageUrl.default(""),
  primaryColor: z.string().trim().max(40).default("#0F0D33"),
  accentColor: z.string().trim().max(40).default("#E05A2B"),
  backgroundColor: z.string().trim().max(40).default("#FAFAF8"),
  textColor: z.string().trim().max(40).default("#0F0D33"),
  fontDisplay: z.string().trim().max(80).default("Fraunces"),
  fontBody: z.string().trim().max(80).default("system-ui"),
  tagline: z.string().trim().max(200).default(""),
  photographyStyle: z.string().trim().max(400).default(""),
  voiceTone: z.string().trim().max(400).default(""),
  languages: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  customerNotes: z.string().trim().max(1000).default(""),
  productsNotes: z.string().trim().max(1000).default(""),
  visualRules: z.string().trim().max(1000).default(""),
  approvedImagery: z
    .array(
      z.object({
        url: z.union([z.string().url().max(500), z.string().regex(/^\/[a-zA-Z0-9._\-/]+$/).max(500)]),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .max(24)
    .default([]),
});

export type BrandDnaInput = z.infer<typeof brandDnaSchema>;

export type BrandDnaRow = BrandKitRow & {
  tagline: string;
  photography_style: string;
  voice_tone: string;
  languages: string[];
  customer_notes: string;
  products_notes: string;
  visual_rules: string;
  approved_imagery: { url: string; label?: string }[];
  dna_version: number;
};

export const BRAND_DNA_SELECT =
  "id, owner_id, business_id, name, logo_url, primary_color, accent_color, background_color, text_color, font_display, font_body, tagline, photography_style, voice_tone, languages, customer_notes, products_notes, visual_rules, approved_imagery, dna_version, created_at, updated_at";

export function normalizeApprovedImagery(raw: unknown): { url: string; label?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { url: string; label?: string }[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ url: item.trim().slice(0, 500) });
      continue;
    }
    if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
      const url = String((item as { url: string }).url).trim().slice(0, 500);
      if (!url) continue;
      const label =
        typeof (item as { label?: unknown }).label === "string"
          ? String((item as { label: string }).label).trim().slice(0, 80)
          : undefined;
      out.push(label ? { url, label } : { url });
    }
  }
  return out.slice(0, 24);
}

export function rowToBrandDna(row: Record<string, unknown>): BrandDnaRow {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    business_id: (row.business_id as string | null) ?? null,
    name: String(row.name ?? "Brand DNA"),
    logo_url: String(row.logo_url ?? ""),
    primary_color: String(row.primary_color ?? "#0F0D33"),
    accent_color: String(row.accent_color ?? "#E05A2B"),
    background_color: String(row.background_color ?? "#FAFAF8"),
    text_color: String(row.text_color ?? "#0F0D33"),
    font_display: String(row.font_display ?? "Fraunces"),
    font_body: String(row.font_body ?? "system-ui"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    tagline: String(row.tagline ?? ""),
    photography_style: String(row.photography_style ?? ""),
    voice_tone: String(row.voice_tone ?? ""),
    languages: Array.isArray(row.languages)
      ? (row.languages as unknown[]).map((l) => String(l)).filter(Boolean).slice(0, 12)
      : [],
    customer_notes: String(row.customer_notes ?? ""),
    products_notes: String(row.products_notes ?? ""),
    visual_rules: String(row.visual_rules ?? ""),
    approved_imagery: normalizeApprovedImagery(row.approved_imagery),
    dna_version: typeof row.dna_version === "number" ? row.dna_version : 1,
  };
}

/** Plain-language block for AI prompts (Studio generate, Creative Director). */
export function brandDnaPromptBlock(dna: BrandDnaRow | null | undefined): string {
  if (!dna) return "";
  const lines = [
    `Brand: ${dna.name}`,
    dna.tagline ? `Tagline: ${dna.tagline}` : "",
    `Colors: primary ${dna.primary_color}, accent ${dna.accent_color}, bg ${dna.background_color}, text ${dna.text_color}`,
    `Fonts: display ${dna.font_display}, body ${dna.font_body}`,
    dna.voice_tone ? `Voice: ${dna.voice_tone}` : "",
    dna.photography_style ? `Photography: ${dna.photography_style}` : "",
    dna.languages.length ? `Languages: ${dna.languages.join(", ")}` : "",
    dna.customer_notes ? `Customer: ${dna.customer_notes}` : "",
    dna.products_notes ? `Products: ${dna.products_notes}` : "",
    dna.visual_rules ? `Visual rules: ${dna.visual_rules}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function brandDnaCompleteness(dna: BrandDnaRow): {
  score: number;
  missing: string[];
} {
  const missing: string[] = [];
  if (!dna.logo_url.trim()) missing.push("logo");
  if (!dna.tagline.trim()) missing.push("tagline");
  if (!dna.voice_tone.trim()) missing.push("voice");
  if (!dna.photography_style.trim()) missing.push("photography style");
  if (!dna.visual_rules.trim()) missing.push("visual rules");
  if (!dna.languages.length) missing.push("languages");
  if (!dna.customer_notes.trim()) missing.push("customer");
  if (!dna.products_notes.trim()) missing.push("products");
  const total = 8;
  const score = Math.round(((total - missing.length) / total) * 100);
  return { score, missing };
}

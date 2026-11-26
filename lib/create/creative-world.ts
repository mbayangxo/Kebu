import { z } from "zod";

function safeUrl(value: string, links = false): boolean {
  if (!value) return true;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (links && (/^#[a-z0-9_-]*$/i.test(value) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value))) return true;
  try { const url = new URL(value); return ["https:", "http:", ...(links ? ["mailto:", "tel:"] : [])].includes(url.protocol); } catch { return false; }
}
const media = z.string().trim().max(2000).refine(value => safeUrl(value), "Use an uploaded file or an HTTP media URL");
export const creativeWorldLinkSchema = z.string().trim().max(300).refine(value => safeUrl(value, true), "Invalid link");
export const worldGroups = ["artists", "releases", "world", "videos"] as const;
export const wallModes = ["wall", "film", "people", "campaigns", "chaos"] as const;
export const creativeWorldSchema = z.object({
  brand: z.string().trim().max(80).default("Your studio"),
  heading: z.string().trim().max(160).default("Make something unforgettable."),
  intro: z.string().trim().max(1000).default(""),
  eyebrow: z.string().trim().max(160).default("Creative studio"),
  footer: z.string().trim().max(160).default("Explore our world"),
  background: z.string().regex(/^#[0-9a-f]{6}$/i).default("#141311"),
  foreground: z.string().regex(/^#[0-9a-f]{6}$/i).default("#f3eee4"),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#ff651b"),
  motion: z.boolean().default(true),
  dropMode: z.boolean().default(false),
  dropHeading: z.string().trim().max(160).default(""),
  dropAccent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#baff29"),
  video: media.default(""), audio: media.default(""),
  zones: z.array(z.object({
    id: z.enum(worldGroups), label: z.string().trim().max(40),
    heading: z.string().trim().max(160), body: z.string().trim().max(1000).default(""),
  })).length(4).refine(zones => new Set(zones.map(zone => zone.id)).size === 4, "Each direction must appear once"),
  cards: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/).max(80), title: z.string().trim().max(120),
    body: z.string().trim().max(1000).default(""), image: media.default(""), href: creativeWorldLinkSchema.default(""),
    group: z.enum(worldGroups), kind: z.enum(["work", "person", "campaign", "film"]).default("work"),
    x: z.number().min(-20).max(20).default(0), y: z.number().min(-20).max(20).default(0),
    rotation: z.number().min(-25).max(25).default(0),
  })).max(40).refine(cards => new Set(cards.map(card => card.id)).size === cards.length, "Cards need unique identities"),
});
export type CreativeWorld = z.infer<typeof creativeWorldSchema>;
export function defaultCreativeWorld(): CreativeWorld {
  return creativeWorldSchema.parse({ zones: worldGroups.map(id => ({ id, label: id === "world" ? "Our world" : id, heading: id === "world" ? "Our world" : id })), cards: [] });
}

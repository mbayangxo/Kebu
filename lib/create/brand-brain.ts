import { z } from "zod";
import { brandDnaSchema, rowToBrandDna, BRAND_DNA_SELECT } from "@/lib/studio/brand-dna";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";

const note = z.string().trim().max(1000);
const asset = z.string().trim().max(500).refine(value => {
  if(value===""||/^\/(?!\/)[^\\\s"'<>]*$/.test(value))return true;
  if(!/^https:\/\/[^\s"'<>\\]+$/.test(value))return false;
  try{const url=new URL(value);return !!url.hostname&&!url.username&&!url.password;}catch{return false;}
}, "Use an HTTPS URL or a same-origin asset path.");
const approvedImage = z.strictObject({url:asset.refine(Boolean,"Choose an image."),label:z.string().trim().max(80).optional()});
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const font = z.string().refine(value => STUDIO_FONTS_CATALOG.some(entry => entry.family === value), "Choose a supported font.");

export const creativeDnaSchema = z.strictObject({
  composition: z.enum(["balanced", "editorial", "expressive"]).default("balanced"),
  density: z.enum(["airy", "balanced", "dense"]).default("balanced"),
  hierarchy: note.default(""), photography: note.default(""), rules: note.default(""),
});
export const tasteDnaSchema = z.strictObject({
  likes: note.default(""), dislikes: note.default(""), exclusions: note.default(""),
  references: z.array(z.strictObject({ url: asset.refine(value => value.startsWith("https://"), "References require HTTPS."), label: z.string().trim().min(1).max(120), reason: z.string().trim().max(400) })).max(12).default([]),
});
export const motionDnaSchema = z.strictObject({
  enabled: z.boolean().default(false),
  entrance: z.enum(["fade", "rise", "slide-left", "slide-right", "zoom"]).default("fade"),
  interaction: z.enum(["none", "lift", "grow", "dim"]).default("none"),
  maxDuration: z.number().int().min(50).max(5000).default(500),
  maxDistance: z.number().finite().min(0).max(200).default(24),
  notes: note.default(""),
});
export const brandBrainDirectionSchema = z.strictObject({
  creative: creativeDnaSchema.default(() => creativeDnaSchema.parse({})),
  taste: tasteDnaSchema.default(() => tasteDnaSchema.parse({})),
  motion: motionDnaSchema.default(() => motionDnaSchema.parse({})),
});
export const brandBrainSchema = z.strictObject({
  version: z.literal(1),
  brand: brandDnaSchema.extend({ logoUrl: asset, primaryColor: color, accentColor: color, backgroundColor: color, textColor: color, fontDisplay: font, fontBody: font, approvedImagery: z.array(approvedImage).max(24) }).strict(),
  ...brandBrainDirectionSchema.shape,
});
const storedDirectionSchema = z.strictObject({version:z.literal(1),...brandBrainDirectionSchema.shape});
export type BrandBrain = z.infer<typeof brandBrainSchema>;
export type BrandBrainRecord = { id: string; revision: number; profile: BrandBrain };
export const brandBrainRecordSchema = z.strictObject({id:z.string().uuid(),revision:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),profile:brandBrainSchema});
export const BRAND_BRAIN_SELECT = `${BRAND_DNA_SELECT},brain_profile,brain_revision`;
export function newBrandBrain(): BrandBrain {
  return brandBrainSchema.parse({version:1,brand:brandDnaSchema.parse({}),...brandBrainDirectionSchema.parse({})});
}
export function brandBrainFromRow(row: Record<string, unknown>): BrandBrainRecord {
  const dna = rowToBrandDna(row);
  // Do not let the permissive legacy normalizer truncate or discard foreign data.
  const languages=z.array(z.string().trim().min(1).max(40)).max(12).parse(row.languages??[]);
  const imagery=z.array(z.union([asset.refine(Boolean),approvedImage])).max(24).parse(row.approved_imagery??[]).map(image=>typeof image==="string"?{url:image}:image);
  const rawDirection=z.record(z.string(),z.unknown()).parse(row.brain_profile);
  const direction=Object.keys(rawDirection).length?storedDirectionSchema.parse(rawDirection):brandBrainDirectionSchema.parse({});
  return {
    id: z.string().uuid().parse(row.id), revision: z.number().int().positive().parse(row.brain_revision),
    profile: brandBrainSchema.parse({version:1,brand:{
      name:dna.name,businessId:dna.business_id,logoUrl:dna.logo_url,primaryColor:dna.primary_color,accentColor:dna.accent_color,backgroundColor:dna.background_color,textColor:dna.text_color,fontDisplay:dna.font_display,fontBody:dna.font_body,tagline:dna.tagline,photographyStyle:dna.photography_style,voiceTone:dna.voice_tone,languages,customerNotes:dna.customer_notes,productsNotes:dna.products_notes,visualRules:dna.visual_rules,approvedImagery:imagery,
    },...direction}),
  };
}
export function brandBrainStoredFields(input: BrandBrain) {
  const p = brandBrainSchema.parse(input), b = p.brand;
  return {name:b.name,business_id:b.businessId??null,logo_url:b.logoUrl,primary_color:b.primaryColor,accent_color:b.accentColor,background_color:b.backgroundColor,text_color:b.textColor,font_display:b.fontDisplay,font_body:b.fontBody,tagline:b.tagline,photography_style:b.photographyStyle,voice_tone:b.voiceTone,languages:b.languages,customer_notes:b.customerNotes,products_notes:b.productsNotes,visual_rules:b.visualRules,approved_imagery:b.approvedImagery,brain_profile:{version:1,creative:p.creative,taste:p.taste,motion:p.motion}};
}
/** Data, not executable prompts: a provider must treat all notes as untrusted user content. */
export function compileBrandBrain(input: BrandBrain) {
  const profile = brandBrainSchema.parse(input);
  return { version:1 as const, source:"owner-authored" as const, profile, constraints:{
    palette:[profile.brand.primaryColor,profile.brand.accentColor,profile.brand.backgroundColor,profile.brand.textColor],
    fonts:[profile.brand.fontDisplay,profile.brand.fontBody],
    motion:{enabled:profile.motion.enabled,entrance:profile.motion.entrance,interaction:profile.motion.interaction,maxDuration:profile.motion.maxDuration,maxDistance:profile.motion.maxDistance,respectReducedMotion:true as const},
  }};
}

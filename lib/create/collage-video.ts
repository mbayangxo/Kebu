import { z } from "zod";

// Direct media files only. Provider iframe embeds belong to the existing Video section.
export const collageMediaUrlSchema = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  if (/^\/(?![\\/])[^\\\s]*$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}, "Use an uploaded file or a complete https address.");
export const collagePageLinkSchema = z.string().trim().max(500).refine(value => !value || /^\/(?![\\/])[^\\\s]*$/.test(value) || /^#[a-z0-9_-]+$/i.test(value) || collageMediaUrlSchema.safeParse(value).success, "Use a page path or an https link.");
export const collageVideoSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  label: z.string().trim().min(1).max(120).default("Video"),
  src: collageMediaUrlSchema.default(""), poster: collageMediaUrlSchema.default(""),
  captionsSrc: collageMediaUrlSchema.default(""), captionsLanguage: z.string().regex(/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/).default("en"),
  mode: z.enum(["controls", "loop", "scrub"]).default("controls"),
  href: collagePageLinkSchema.default(""), linkLabel: z.string().trim().min(1).max(80).default("Explore this story"),
  leftPct: z.number().min(-20).max(110).default(10), topPct: z.number().min(-20).max(110).default(25),
  widthPct: z.number().min(10).max(100).default(70), aspectRatio: z.number().min(0.3).max(4).default(16/9),
  radius: z.number().min(0).max(200).default(20), zIndex: z.number().int().min(1).max(80).default(10),
  frameShape: z.enum(["rectangle", "oval", "torn", "ticket"]).optional(),
  frameWidth: z.number().min(0).max(20).optional(),
  frameColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  travelX: z.number().min(-1000).max(1000).default(0), travelY: z.number().min(-1000).max(1000).default(-80),
  rotate: z.number().min(-180).max(180).default(0), endScale: z.number().min(0.2).max(3).default(1),
  scrollStart: z.number().min(0).max(0.95).default(0), scrollEnd: z.number().min(0.01).max(1).default(1),
}).refine(value => value.scrollEnd > value.scrollStart, "End must follow start.");
export const collageVideosSchema = z.array(collageVideoSchema).max(6).refine(items => new Set(items.map(item => item.id)).size === items.length, "Video ids must be unique.");
export type CollageVideo = z.infer<typeof collageVideoSchema>;
export function collageVideoClip(shape: CollageVideo['frameShape']) {
  if(shape==='oval')return 'ellipse(50% 50% at 50% 50%)';
  if(shape==='torn')return 'polygon(1% 3%,15% 0%,29% 3%,42% 0%,57% 2%,72% 0%,87% 3%,99% 1%,97% 22%,100% 41%,98% 59%,100% 79%,97% 99%,80% 97%,65% 100%,48% 97%,31% 100%,15% 98%,1% 100%,3% 78%,0% 58%,2% 39%,0% 19%)';
  if(shape==='ticket')return 'polygon(5% 0,95% 0,95% 7%,100% 12%,100% 88%,95% 93%,95% 100%,5% 100%,5% 93%,0 88%,0 12%,5% 7%)';
  return undefined;
}
export function collageVideoProgress(layer: CollageVideo, progress: number, enabled = true) {
  return enabled ? Math.max(0, Math.min(1, (progress-layer.scrollStart)/(layer.scrollEnd-layer.scrollStart))) : 0;
}
export function collageVideoTransform(layer: CollageVideo, progress: number, enabled = true) {
  const p = collageVideoProgress(layer, progress, enabled);
  return `translate3d(${layer.travelX*p}px, ${layer.travelY*p}px, 0) rotate(${layer.rotate*p}deg) scale(${1+(layer.endScale-1)*p})`;
}

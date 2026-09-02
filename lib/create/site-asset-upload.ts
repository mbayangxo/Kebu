export const SITE_ASSET_SPECS = {
  favicon: {
    label: "Favicon",
    hint: "Square PNG — 64×64 or 128×128 px works best.",
    accept: "image/png,image/jpeg,image/webp,image/x-icon",
    maxBytes: 512_000,
    storageKind: "image" as const,
  },
  logo: {
    label: "Site logo",
    hint: "PNG with transparent background — 512×512 px recommended.",
    accept: "image/png,image/webp,image/jpeg",
    maxBytes: 2_000_000,
    storageKind: "image" as const,
  },
  ogImage: {
    label: "Social preview image",
    hint: "1200×630 px — shows when you share the link on WhatsApp, Instagram, etc.",
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 3_000_000,
    storageKind: "image" as const,
  },
  product: {
    label: "Product photo",
    hint: "Square or 4:5 — at least 800×800 px for a sharp catalog.",
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 3_000_000,
    storageKind: "image" as const,
  },
  section: {
    label: "Image",
    hint: "JPG or transparent PNG cutout — keep under 5 MB for fast loading on mobile.",
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5_000_000,
    storageKind: "image" as const,
  },
  audio: {
    label: "Music / audio file",
    hint: "MP3, M4A, WAV, or OGG from your computer — up to 25 MB.",
    accept: "audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg",
    maxBytes: 25_000_000,
    storageKind: "audio" as const,
  },
  video: {
    label: "Video file",
    hint: "MP4 or WebM from your computer — up to 50 MB. Compress for slow networks.",
    accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
    maxBytes: 50_000_000,
    storageKind: "video" as const,
  },
} as const;

export type SiteAssetKind = keyof typeof SITE_ASSET_SPECS;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function guessContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function isHostedMediaUrl(src: string): boolean {
  const s = src.trim().toLowerCase();
  return (
    s.endsWith(".mp3") ||
    s.endsWith(".m4a") ||
    s.endsWith(".wav") ||
    s.endsWith(".ogg") ||
    s.endsWith(".aac") ||
    s.endsWith(".mp4") ||
    s.endsWith(".webm") ||
    s.endsWith(".mov") ||
    s.includes("/storage/v1/object/public/site-assets/")
  );
}

export function isDirectAudioUrl(src: string): boolean {
  return /\.(mp3|m4a|wav|ogg|aac|webm)(\?|$)/i.test(src) || isHostedMediaUrl(src);
}

export function isDirectVideoUrl(src: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(src) || (isHostedMediaUrl(src) && !isDirectAudioUrl(src));
}

/**
 * Supabase Storage Image Transforms
 * Converts storage object URLs to render/image URLs for WebP + resize.
 * Only transforms *.supabase.co URLs — all others pass through unchanged.
 */
export function supabaseImgUrl(src: string, width: number, quality = 80): string {
  if (!src?.trim()) return src;
  // Already a render URL — avoid double-transforming
  if (src.includes("/storage/v1/render/image/")) return src;
  // Match supabase object URL: https://<ref>.supabase.co/storage/v1/object/public/<rest>
  const m = src.match(/^(https?:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/(public\/.+?)(\?.*)?$/);
  if (!m) return src;
  return `${m[1]}/render/image/${m[2]}?width=${width}&format=webp&quality=${quality}`;
}

/** Returns true only for Supabase-hosted assets (site-assets bucket, etc.) */
export function isSupabaseStorageUrl(src: string): boolean {
  return /supabase\.co\/storage\/v1\/object\/public\//.test(src);
}

/**
 * Safe post-login redirect: same-origin relative paths only.
 * Blocks open redirects (//evil.com, https://..., javascript:, etc.).
 */
export function safeAuthNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  const next = raw.trim();
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  if (next.includes("\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}

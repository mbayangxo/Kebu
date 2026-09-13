/** Strip internal developer notes (migration instructions) from error messages before showing to users. */
export function sanitizeApiError(msg: string | null | undefined, fallback = "Something went wrong."): string {
  if (!msg) return fallback;
  const cleaned = msg
    .replace(/\bApply migration\b[^.]*\./gi, "")
    .replace(/\bapply migration\b[^.]*\./gi, "")
    .replace(/\bRe-run APPLY_MIGRATIONS[^.]*\./gi, "")
    .replace(/\bsupabase\b[^.]*\./gi, "")
    .trim();
  return cleaned || fallback;
}

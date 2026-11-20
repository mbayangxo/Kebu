/** Digits from a price label like "8,000 XOF" → 8000. */
export function parseXofFromLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const digits = label.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 50_000_000);
}


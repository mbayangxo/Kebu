/** Opportunity OS trust labels — use consistently in API + UI. */

export const OPPORTUNITY_TRUST_LABELS = {
  curated: "Curated / public overview",
  curatedDetail:
    "Compiled for entrepreneurs from public and curated sources. Not official government verification unless a listed source is an official portal.",
  ai_generated: "AI-generated opportunity analysis — not verified fact",
  estimated: "Estimated",
  requires_validation: "Requires validation",
} as const;

export type CuratedSource = {
  title?: string;
  type?: string;
  note?: string;
  url?: string;
};

/** Normalize `sources` JSON from country_profiles for display. */
export function parseCuratedSources(raw: unknown): CuratedSource[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : undefined,
      type: typeof item.type === "string" ? item.type : undefined,
      note: typeof item.note === "string" ? item.note : undefined,
      url: typeof item.url === "string" ? item.url : undefined,
    }))
    .filter((s) => s.title || s.url || s.note);
}

export function formatLastVerified(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

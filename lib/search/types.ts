export type SearchResult = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  kind: "site" | "design" | "business" | "opportunity" | "page";
  source?: "kebu_private" | "kebu_public";
  trustLabel?: string;
  accent?: string;
  sourceUrl?: string;
  sourceName?: string;
  fetchedAt?: string;
};

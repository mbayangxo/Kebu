/** Normalize user slug input for project pages API. */
export function normalizePageSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isValidPageSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 60;
}

/** Mutation receipts must describe the exact page/order that the user submitted. */
export type PageReceipt = { id: string; title: string; slug: string; sort_order: number; parent_id?: string | null };
export function confirmedPage(value: unknown, expected: { id?: string; title: string; slug: string; parent_id?: string | null }): value is PageReceipt {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<PageReceipt>;
  return typeof page.id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(page.id)
    && (!expected.id || page.id === expected.id) && page.title === expected.title && page.slug === expected.slug
    && Number.isInteger(page.sort_order) && page.sort_order! >= 0
    && (expected.parent_id === undefined || (page.parent_id ?? null) === expected.parent_id);
}
export function confirmedPageOrder(value: unknown, expected: PageReceipt[]): value is PageReceipt[] {
  return Array.isArray(value) && value.length === expected.length && new Set(value.map(page => page?.id)).size === expected.length
    && expected.every((page, index) => value.some(candidate => candidate?.sort_order === index && confirmedPage(candidate, page)));
}

/** Compute sort_order when inserting a section after another (or at top). */

export type SectionOrderRow = { id: string; sort_order: number };

export function nextSortOrderAfter(
  afterSectionId: string | null | undefined,
  siblings: SectionOrderRow[],
): { insertOrder: number; bumpFrom: number | null } {
  const sorted = [...siblings].sort((a, b) => a.sort_order - b.sort_order);

  if (afterSectionId === undefined) {
    const max = sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) : -1;
    return { insertOrder: max + 1, bumpFrom: null };
  }

  if (afterSectionId === null) {
    const min = sorted.length ? Math.min(...sorted.map((s) => s.sort_order)) : 0;
    return { insertOrder: min > 0 ? 0 : min, bumpFrom: sorted.length ? min : null };
  }
  const after = sorted.find((s) => s.id === afterSectionId);
  if (!after) {
    const max = sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) : -1;
    return { insertOrder: max + 1, bumpFrom: null };
  }
  return { insertOrder: after.sort_order + 1, bumpFrom: after.sort_order + 1 };
}

export function applyInsertBump(
  siblings: SectionOrderRow[],
  bumpFrom: number | null,
): SectionOrderRow[] {
  if (bumpFrom === null) return siblings;
  return siblings.map((s) =>
    s.sort_order >= bumpFrom ? { ...s, sort_order: s.sort_order + 1 } : s,
  );
}

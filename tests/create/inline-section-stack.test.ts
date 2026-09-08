import { describe, expect, it } from "vitest";
import { applyInsertBump, nextSortOrderAfter } from "@/lib/create/section-insert";

describe("section insert order (B8)", () => {
  const siblings = [
    { id: "a", sort_order: 0 },
    { id: "b", sort_order: 1 },
    { id: "c", sort_order: 2 },
  ];

  it("appends when no insertAfter", () => {
    const { insertOrder, bumpFrom } = nextSortOrderAfter(undefined, siblings);
    expect(insertOrder).toBe(3);
    expect(bumpFrom).toBeNull();
  });

  it("inserts at top when insertAfter is null", () => {
    const { insertOrder, bumpFrom } = nextSortOrderAfter(null, siblings);
    expect(insertOrder).toBe(0);
    expect(bumpFrom).toBe(0);
    const bumped = applyInsertBump(siblings, bumpFrom!);
    expect(bumped.map((s) => s.sort_order)).toEqual([1, 2, 3]);
  });

  it("inserts after a section id", () => {
    const { insertOrder, bumpFrom } = nextSortOrderAfter("b", siblings);
    expect(insertOrder).toBe(2);
    expect(bumpFrom).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { confirmedPage, confirmedPageOrder, isValidPageSlug, normalizePageSlug } from "@/lib/create/builder-pages";

describe("builder-pages slug helpers", () => {
  it("normalizes titles into URL slugs", () => {
    expect(normalizePageSlug("May's World")).toBe("mays-world");
    expect(normalizePageSlug("  About May  ")).toBe("about-may");
    expect(normalizePageSlug("Shop!!!")).toBe("shop");
  });

  it("strips invalid characters and caps length", () => {
    const long = "a".repeat(80);
    expect(normalizePageSlug(long).length).toBeLessThanOrEqual(60);
    expect(normalizePageSlug("hello--world--")).toBe("hello--world");
  });

  it("validates slug format", () => {
    expect(isValidPageSlug("shop")).toBe(true);
    expect(isValidPageSlug("about-may")).toBe(true);
    expect(isValidPageSlug("About")).toBe(false);
    expect(isValidPageSlug("-shop")).toBe(false);
    expect(isValidPageSlug("shop-")).toBe(false);
    expect(isValidPageSlug("")).toBe(false);
  });
});

describe("Builder page receipts", () => {
  const page = { id: "11111111-1111-4111-8111-111111111111", title: "Home", slug: "home", sort_order: 0, parent_id: null };
  it("requires the exact submitted page identity and fields", () => {
    expect(confirmedPage(page, page)).toBe(true);
    for (const invalid of [null, {}, { ...page, id: "wrong" }, { ...page, title: "Other" }, { ...page, slug: "other" }, { ...page, sort_order: -1 }, { ...page, parent_id: page.id }]) expect(confirmedPage(invalid, page)).toBe(false);
  });
  it("rejects missing, duplicate or misordered receipts", () => {
    const other = { ...page, id: "22222222-2222-4222-8222-222222222222", title: "About", slug: "about", sort_order: 1 };
    expect(confirmedPageOrder([other, page], [page, other])).toBe(true);
    for (const invalid of [undefined, [], [page], [page, page], [{ ...other, sort_order: 0 }, { ...page, sort_order: 1 }]]) expect(confirmedPageOrder(invalid, [page, other])).toBe(false);
  });
});

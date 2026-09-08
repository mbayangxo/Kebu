import { describe, expect, it } from "vitest";
import { isValidPageSlug, normalizePageSlug } from "@/lib/create/builder-pages";

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

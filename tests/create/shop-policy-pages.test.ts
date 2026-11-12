/**
 * Part 4 finding: every Shop-capable theme could only seed a page as
 * "blank" or May-specific "about-may" — no FAQ/shipping/returns/privacy/
 * terms starter content existed anywhere. Proves the new seeds
 * (lib/create/shop-policy-pages.ts) are real and usable: valid slugs,
 * substantive (not placeholder) content, and correctly excluded from the
 * other two seed kinds.
 */
import { describe, expect, it } from "vitest";
import { SHOP_POLICY_PAGE_SEEDS, shopPolicySeedBySlug } from "@/lib/create/shop-policy-pages";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // same regex the pages route enforces

describe("shop FAQ/policy page seeds", () => {
  it("covers all five standard pages a Shop-capable theme needs", () => {
    const slugs = SHOP_POLICY_PAGE_SEEDS.map((s) => s.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["faq", "shipping-policy", "returns-policy", "privacy-policy", "terms-of-service"]),
    );
    expect(slugs.length).toBe(5);
  });

  it("uses slugs the pages route's own slug validator accepts", () => {
    for (const seed of SHOP_POLICY_PAGE_SEEDS) {
      expect(seed.slug).toMatch(SLUG_RE);
      expect(seed.slug.length).toBeLessThanOrEqual(60);
    }
  });

  it("gives every page real, substantive content — not a placeholder stub", () => {
    for (const seed of SHOP_POLICY_PAGE_SEEDS) {
      if (seed.sectionType === "faq") {
        const items = (seed.props.items as { question: string; answer: string }[]) ?? [];
        expect(items.length).toBeGreaterThanOrEqual(3);
        for (const item of items) {
          expect(item.question.length).toBeGreaterThan(5);
          expect(item.answer.length).toBeGreaterThan(10);
        }
      } else {
        const body = String(seed.props.body ?? "");
        expect(body.length).toBeGreaterThan(200); // real paragraphs, not "Tell your story."
        expect(body).not.toMatch(/lorem ipsum/i);
      }
    }
  });

  it("is honest that it's a starting template, not finished legal copy", () => {
    const legal = SHOP_POLICY_PAGE_SEEDS.filter((s) => s.slug === "privacy-policy" || s.slug === "terms-of-service");
    for (const seed of legal) {
      expect(String(seed.props.body)).toMatch(/not legal advice/i);
    }
  });

  it("resolves a known policy slug and returns undefined for the other seed kinds", () => {
    expect(shopPolicySeedBySlug("faq")?.slug).toBe("faq");
    expect(shopPolicySeedBySlug("blank")).toBeUndefined();
    expect(shopPolicySeedBySlug("about-may")).toBeUndefined();
  });
});

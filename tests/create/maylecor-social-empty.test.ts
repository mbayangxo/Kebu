import { describe, expect, it } from "vitest";
import { MAYLECOR_SOCIAL_DEFAULTS } from "@/lib/create/maylecor-defaults";

/**
 * Mirrors MaylecorSocialBar / MaylecorSiteFooter resolution:
 * undefined → defaults; [] → empty (left-nav cleared); populated → use as-is.
 */
function resolveSocialLinks(
  links: { label: string; iconUrl: string; href: string }[] | undefined,
): { label: string; iconUrl: string; href: string }[] {
  if (links === undefined) return MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s }));
  return links.filter((l) => String(l.href ?? "").trim() && String(l.href) !== "#");
}

describe("May social icons left-nav empty state", () => {
  it("undefined links fall back to May defaults", () => {
    const items = resolveSocialLinks(undefined);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.label).toBe(MAYLECOR_SOCIAL_DEFAULTS[0]?.label);
  });

  it("empty array does not resurrect defaults", () => {
    expect(resolveSocialLinks([])).toEqual([]);
  });

  it("explicit links are kept", () => {
    const custom = [{ label: "IG", iconUrl: "/x.png", href: "https://instagram.com/x" }];
    expect(resolveSocialLinks(custom)).toEqual(custom);
  });
});

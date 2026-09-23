import { describe, expect, it } from "vitest";
/**
 * Mirrors MaylecorSocialBar / MaylecorSiteFooter resolution:
 * Missing/empty → no icons. The private seed owns initial defaults; the renderer never resurrects them.
 */
function resolveSocialLinks(
  links: { label: string; iconUrl: string; href: string }[] | undefined,
): { label: string; iconUrl: string; href: string }[] {
  return (links ?? []).filter((l) => String(l.href ?? "").trim() && String(l.href) !== "#");
}

describe("May social icons left-nav empty state", () => {
  it("missing links stay empty instead of resurrecting hard-coded owner socials", () => {
    expect(resolveSocialLinks(undefined)).toEqual([]);
  });

  it("empty array does not resurrect defaults", () => {
    expect(resolveSocialLinks([])).toEqual([]);
  });

  it("explicit links are kept", () => {
    const custom = [{ label: "IG", iconUrl: "/x.png", href: "https://instagram.com/x" }];
    expect(resolveSocialLinks(custom)).toEqual(custom);
  });
});

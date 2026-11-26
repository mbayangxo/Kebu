import { createElement } from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { socialDestination, socialPlatform, stockSocialPlatform } from "@/lib/create/social-links";
import { EditableSocialRail } from "@/app/components/create/editable-social-rail";
import { MaylecorSocialBar } from "@/app/components/create/maylecor-social-bar";
import { MAYLECOR_SOCIAL_DEFAULTS } from "@/lib/create/maylecor-defaults";

describe("intentional social destinations and original icons", () => {
  it.each(["", "#", "javascript:alert(1)", "data:text/html,bad", "//example.com", "/contact", "https://owner:secret@example.com", "spotify.com/artist/name"])("does not publish invalid/unset destination %s", href => {
    expect(socialDestination(href)).toBeNull();
    const links = [{ label: "Spotify", iconUrl: "", href }];
    expect(renderToStaticMarkup(createElement(EditableSocialRail, { links }))).toBe("");
    expect(renderToStaticMarkup(createElement(MaylecorSocialBar, { links }))).toBe("");
  });
  it("preserves the actual artist destination and renders a local stock icon in SSR", () => {
    const links = [{ ...MAYLECOR_SOCIAL_DEFAULTS[2], href: "https://open.spotify.com/artist/real?si=code" }];
    const html = renderToStaticMarkup(createElement(EditableSocialRail, { links }));
    expect(html).toContain('href="https://open.spotify.com/artist/real?si=code"');
    expect(html).toContain("<svg"); expect(html).not.toContain("wixstatic"); expect(html).not.toContain("<img");
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("makes unconfigured links honestly editable without exposing empty public anchors", () => {
    const links = MAYLECOR_SOCIAL_DEFAULTS.map(link => ({ ...link }));
    const html = renderToStaticMarkup(createElement(EditableSocialRail, { links, editing: true }));
    expect(html).toContain("Edit social links"); expect(html).toContain("Set links");
    expect(html.match(/<svg/g)).toHaveLength(6); expect(html).not.toContain("<a "); expect(html).not.toContain("wixstatic");
  });
  it("does not replace arbitrary custom artwork, even on Wix", () => {
    const custom = "https://static.wixstatic.com/media/my-original.png";
    expect(stockSocialPlatform(custom)).toBeUndefined();
    const html = renderToStaticMarkup(createElement(EditableSocialRail, { editing: true, links: [{ label: "Instagram", href: "", iconUrl: custom }] }));
    expect(html).toContain(custom); expect(html).toContain("<img");
  });
  it("recognizes only exact stock URLs and common platform labels", () => {
    for (const item of MAYLECOR_SOCIAL_DEFAULTS) expect(stockSocialPlatform(item.iconUrl)).toBe(socialPlatform(item.label));
    expect(stockSocialPlatform("https://evil.example/media/e18eec328e7446079b7c7cef09488b18.png")).toBeUndefined();
    expect(socialPlatform("Apple Music")).toBe("apple");
    expect(socialPlatform("My original page")).toBeUndefined();
  });
});

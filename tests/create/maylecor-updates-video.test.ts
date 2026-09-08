import { describe, expect, it } from "vitest";
import { extractVimeoId, extractYoutubeId } from "@/app/components/video-embed";
import { maylecorMotionSitePages } from "@/lib/create/maylecor-site-pages";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";

describe("May Lecor updates + video links", () => {
  it("blueprint includes Updates page with video + feed sections", () => {
    const pages = maylecorMotionSitePages("MAY LECOR");
    const updates = pages.find((p) => p.slug === "updates");
    expect(updates).toBeTruthy();
    expect(updates?.title).toBe("Updates");
    const types = (updates?.sections ?? []).map((s) => s.type);
    expect(types).toContain("features");
    expect(types).toContain("video");
    expect(types).toContain("gallery");
  });

  it("hero defaults include chrome logo and nav display", () => {
    const props = defaultMaylecorKsendrProps();
    expect(props.showChromeLogo).toBe(true);
    expect(String(props.chromeLogo)).toContain("logo-stacked");
    expect(props.navDisplay).toBe("text");
    expect(props.navLinks.some((l: { href: string }) => l.href === "/updates")).toBe(true);
  });

  it("parses YouTube and Vimeo links", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractVimeoId("https://vimeo.com/148751763")).toBe("148751763");
    expect(extractVimeoId("https://player.vimeo.com/video/148751763")).toBe("148751763");
  });
});

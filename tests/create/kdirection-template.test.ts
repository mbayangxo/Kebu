import { describe, expect, it } from "vitest";
import { defaultKdirectionHomeProps, KDIRECTION_WIX_GRADIENT } from "@/lib/create/kdirection-defaults";
import { kdirectionWixSitePages } from "@/lib/create/kdirection-site-pages";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("kdirection builder template", () => {
  it("ships Wix-accurate home defaults with editable collage + logo slots", () => {
    const props = defaultKdirectionHomeProps();
    expect(props.backgroundCss).toBe(KDIRECTION_WIX_GRADIENT);
    expect(props.displayFont).toBe("Oswald");
    expect(props.navButtonBg).toBe("#FFF86B");
    expect(props.showHomeIcon).toBe(true);
    expect(props.logoImage).toBe("");
    expect(props.collagePhotos.length).toBeGreaterThanOrEqual(4);
    for (const photo of props.collagePhotos) {
      expect(photo.src).toMatch(/^https:\/\//);
      expect(typeof photo.topPct).toBe("number");
      expect(typeof photo.leftPct).toBe("number");
      expect(typeof photo.rotate).toBe("number");
      expect(typeof photo.widthPct).toBe("number");
    }
    expect(props.socialLinks.length).toBeGreaterThanOrEqual(1);
    expect(props.navLinks.some((l) => /artist/i.test(l.label))).toBe(true);
  });

  it("validates moved collage photo positions after editor-style patch", () => {
    const props = defaultKdirectionHomeProps();
    const collagePhotos = props.collagePhotos.map((p, i) =>
      i === 0 ? { ...p, topPct: 33, leftPct: 41, rotate: -12, widthPct: 18 } : p,
    );
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: {
        primary: "#0A0A0A",
        accent: "#FFF86B",
        background: "#e8e0f0",
        text: "#0A0A0A",
        fontDisplay: "Oswald",
        fontBody: "Arial",
        spacing: "comfortable",
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "kd-home",
              type: "kdirection-home",
              props: {
                ...props,
                logoImage: "/templates/maylecor/portrait.jpg",
                collagePhotos,
                mission: "Cultivating talent.",
                socialLinks: [
                  ...props.socialLinks,
                  { label: "TikTok", iconUrl: "", href: "https://tiktok.com/@kdirection" },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const home = result.data.pages[0]!.sections[0]!;
      expect((home.props as { collagePhotos: { topPct: number }[] }).collagePhotos[0]!.topPct).toBe(33);
    }
  });

  it("multipage Wix shell validates end-to-end", () => {
    const pages = kdirectionWixSitePages();
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: {
        primary: "#0A0A0A",
        accent: "#FFF86B",
        background: "#e8e0f0",
        text: "#0A0A0A",
        fontDisplay: "Oswald",
        fontBody: "Arial",
        spacing: "comfortable",
      },
      pages: pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        sections: p.sections.map((s, i) => ({
          id: `${p.slug}-${i}`,
          type: s.type,
          props: s.props,
        })),
      })),
    });
    expect(result.ok).toBe(true);
  });
});

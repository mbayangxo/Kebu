import { describe, expect, it } from "vitest";
import { preserveTemplateVisualAssets } from "@/lib/create/ai-improve";
import { defaultKdirectionHomeProps } from "@/lib/create/kdirection-defaults";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

function kdSite(overrides?: Record<string, unknown>): WebsiteDefinition {
  const props = { ...defaultKdirectionHomeProps(), ...(overrides ?? {}) };
  return {
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
        sections: [{ id: "kd1", type: "kdirection-home", props }],
      },
    ],
  };
}

describe("preserveTemplateVisualAssets", () => {
  it("restores wiped K-Direction collage and logo after AI rewrite", () => {
    const current = kdSite({ logoImage: "https://example.com/logo.png", mission: "Old mission" });
    const improved = kdSite({
      mission: "New clearer mission for young artists.",
      logoImage: "",
      collagePhotos: [],
      backgroundCss: "#fff",
    });
    const merged = preserveTemplateVisualAssets(current, improved);
    const home = merged.pages[0]!.sections[0]!.props as {
      mission: string;
      logoImage: string;
      collagePhotos: unknown[];
      backgroundCss: string;
    };
    expect(home.mission).toContain("New clearer");
    expect(home.logoImage).toBe("https://example.com/logo.png");
    expect(home.collagePhotos.length).toBeGreaterThan(0);
    expect(home.backgroundCss).toContain("radial-gradient");
    expect(validateWebsiteDefinition(merged).ok).toBe(true);
  });

  it("keeps Russian cutouts when AI blanks legally-blonde-hero assets", () => {
    const current: WebsiteDefinition = {
      schemaVersion: "website-v1",
      title: "May",
      theme: {
        primary: "#E9006B",
        accent: "#E9006B",
        background: "#fff",
        text: "#111",
        fontDisplay: "Steelfish",
        fontBody: "system-ui",
        spacing: "comfortable",
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "m1",
              type: "legally-blonde-hero",
              props: defaultMaylecorKsendrProps("MAY LECOR"),
            },
          ],
        },
      ],
    };
    const improved: WebsiteDefinition = {
      ...current,
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "m1",
              type: "legally-blonde-hero",
              props: {
                ...defaultMaylecorKsendrProps("MAY LECOR"),
                title: "MAY LECOR",
                subtitle: "Fresh bio from Yande",
                cutoutLeft: "",
                cutoutRight: "",
                backgroundLayer: "",
              },
            },
          ],
        },
      ],
    };
    const merged = preserveTemplateVisualAssets(current, improved);
    const props = merged.pages[0]!.sections[0]!.props as {
      subtitle: string;
      cutoutLeft: string;
      backgroundLayer: string;
    };
    expect(props.subtitle).toContain("Yande");
    expect(props.cutoutLeft).toContain("templates/legally-blonde");
    expect(props.backgroundLayer).toContain("templates/legally-blonde");
  });
});

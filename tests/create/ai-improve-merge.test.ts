import { describe, expect, it } from "vitest";
import { buildAiSectionChanges, mergePartialAiDefinition } from "@/lib/create/ai-improve-merge";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

const base: WebsiteDefinition = {
  schemaVersion: "website-v1",
  title: "Demo",
  theme: {
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
    headingScale: "md",
    bodySize: "md",
    letterSpacing: "normal",
  },
  pages: [
    {
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "hero-1",
          type: "hero",
          props: { heading: "Before", subheading: "Old", buttonLabel: "Go", buttonHref: "#" },
        },
      ],
    },
  ],
};

describe("ai-improve partial apply (B6)", () => {
  it("lists changed sections", () => {
    const proposed: WebsiteDefinition = structuredClone(base);
    proposed.pages[0]!.sections[0]!.props.heading = "After";
    const changes = buildAiSectionChanges(base, proposed);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.sectionId).toBe("hero-1");
  });

  it("merges only accepted section ids", () => {
    const proposed: WebsiteDefinition = structuredClone(base);
    proposed.pages[0]!.sections[0]!.props.heading = "After";
    const merged = mergePartialAiDefinition(base, proposed, []);
    expect(merged.pages[0]?.sections[0]?.props.heading).toBe("Before");

    const applied = mergePartialAiDefinition(base, proposed, ["hero-1"]);
    expect(applied.pages[0]?.sections[0]?.props.heading).toBe("After");
  });
});

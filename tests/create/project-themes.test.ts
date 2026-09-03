import { describe, expect, it } from "vitest";
import {
  parseKebuTemplateFile,
  serializeKebuTemplateFile,
  statusesAfterPublish,
} from "@/lib/create/kebu-template-file";
import { defaultKdirectionHomeProps } from "@/lib/create/kdirection-defaults";

const sampleDefinition = {
  schemaVersion: "website-v1" as const,
  title: "Demo site",
  theme: {
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable" as const,
  },
  pages: [
    {
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "hero-1",
          type: "hero" as const,
          props: { heading: "Demo", subheading: "Hello", buttonLabel: "Go", buttonHref: "#" },
        },
      ],
    },
  ],
};

describe("kebu template file + publish swap", () => {
  it("serializes and parses a named Kebu template file", () => {
    const file = serializeKebuTemplateFile("Summer look", sampleDefinition);
    expect(file.name).toBe("Summer look");
    expect(file.kebuTemplate).toBe("kebu-template-website-v1");
    const parsed = parseKebuTemplateFile(file);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.name).toBe("Summer look");
      expect(parsed.definition.title).toBe("Demo site");
    }
  });

  it("rejects HTML / ThemeForest-style uploads", () => {
    const html = parseKebuTemplateFile("<!DOCTYPE html><html><body>Theme</body></html>");
    expect(html.ok).toBe(false);
    if (!html.ok) expect(html.error.toLowerCase()).toMatch(/html|themeforest|wordpress/);
  });

  it("accepts a raw website-v1 definition without envelope", () => {
    const parsed = parseKebuTemplateFile(sampleDefinition, "Fallback");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.name).toBe("Demo site");
  });

  it("publishes one template and drafts the previous live", () => {
    const next = statusesAfterPublish(
      [
        { id: "a", status: "live" as const },
        { id: "b", status: "draft" as const },
      ],
      "b",
    );
    expect(next.find((t) => t.id === "b")?.status).toBe("live");
    expect(next.find((t) => t.id === "a")?.status).toBe("draft");
  });

  it("keeps K-Direction home props valid when wrapped as a template file", () => {
    const def = {
      ...sampleDefinition,
      title: "K-Direction",
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [{ id: "kd", type: "kdirection-home" as const, props: defaultKdirectionHomeProps() }],
        },
      ],
    };
    const parsed = parseKebuTemplateFile(serializeKebuTemplateFile("KD draft", def));
    expect(parsed.ok).toBe(true);
  });
});

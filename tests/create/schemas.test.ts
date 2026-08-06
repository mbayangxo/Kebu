import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  heroPropsSchema,
  updateSectionSchema,
  DEFAULT_HERO_PROPS,
} from "@/lib/create/schemas";

describe("create schemas", () => {
  it("accepts a valid website project title", () => {
    const parsed = createProjectSchema.parse({ title: "Fulani jewelry", projectType: "website" });
    expect(parsed.title).toBe("Fulani jewelry");
    expect(parsed.projectType).toBe("website");
  });

  it("rejects empty titles", () => {
    expect(() => createProjectSchema.parse({ title: "   " })).toThrow();
  });

  it("provides default hero props", () => {
    expect(DEFAULT_HERO_PROPS.heading.length).toBeGreaterThan(0);
    expect(heroPropsSchema.parse({}).heading).toBe(DEFAULT_HERO_PROPS.heading);
  });

  it("rejects oversized hero heading", () => {
    const result = updateSectionSchema.safeParse({
      props: { heading: "x".repeat(200) },
    });
    expect(result.success).toBe(false);
  });

  it("merges partial hero updates", () => {
    const result = updateSectionSchema.parse({ props: { heading: "New title" } });
    expect(result.props.heading).toBe("New title");
  });
});

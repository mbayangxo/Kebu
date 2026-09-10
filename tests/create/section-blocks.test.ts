import { describe, expect, it } from "vitest";
import { blocksForSection } from "@/lib/create/section-blocks";

describe("blocksForSection", () => {
  it("lists free-text blocks", () => {
    const blocks = blocksForSection("free-text", {
      blocks: [
        { id: "a", text: "Hello world this is long enough to truncate maybe" },
        { id: "b", text: "" },
      ],
    });
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.label.startsWith("Hello")).toBe(true);
    expect(blocks[1]?.label).toBe("Text block");
  });

  it("lists FAQ / feature items", () => {
    const blocks = blocksForSection("faq", {
      items: [{ question: "Shipping?" }, { question: "Returns?" }],
    });
    expect(blocks.map((b) => b.label)).toEqual(["Shipping?", "Returns?"]);
  });

  it("lists nav + social + button for hero-like props", () => {
    const blocks = blocksForSection("hero", {
      heading: "Welcome",
      buttonLabel: "Shop",
      navLinks: [{ label: "Home", href: "/" }],
      socialLinks: [{ label: "IG", href: "https://instagram.com" }],
    });
    expect(blocks.some((b) => b.id === "heading")).toBe(true);
    expect(blocks.some((b) => b.id === "button")).toBe(true);
    expect(blocks.some((b) => b.id === "nav-0")).toBe(true);
    expect(blocks.some((b) => b.id === "social-0")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { maylecorAboutMayBlocks, maylecorAboutPageSections } from "@/lib/create/maylecor-about-bio";

describe("About May bio", () => {
  it("splits the bio into editable sections under the text body limit", () => {
    const blocks = maylecorAboutMayBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    expect(blocks[0]?.heading).toMatch(/About May/i);
    expect(blocks[0]?.body).toContain("singer, songwriter");
    expect(blocks.some((b) => b.body.includes("Maytamorphisis"))).toBe(true);
    expect(blocks.some((b) => b.body.includes("Fanta Keita"))).toBe(true);
    for (const b of blocks) {
      expect(b.body.length).toBeLessThanOrEqual(2000);
      expect(b.body.length).toBeGreaterThan(40);
    }
  });

  it("builds about page sections including gallery", () => {
    const sections = maylecorAboutPageSections();
    expect(sections.some((s) => s.type === "text")).toBe(true);
    expect(sections.some((s) => s.type === "gallery")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { googleFontsHrefForTheme, cssFontStack, isSelfHostedThemeFont } from "@/lib/create/site-theme-fonts";

describe("site-theme-fonts", () => {
  it("builds Google CSS for Playfair + IBM Plex (LAYERS defaults)", () => {
    const href = googleFontsHrefForTheme("Playfair Display", "IBM Plex Sans");
    expect(href).toContain("fonts.googleapis.com");
    expect(href).toContain("Playfair");
    expect(href).toContain("IBM+Plex");
  });

  it("returns null for system-only stacks", () => {
    expect(googleFontsHrefForTheme("system-ui", "Arial")).toBeNull();
  });

  it("marks Steelfish as self-hosted", () => {
    expect(isSelfHostedThemeFont("Steelfish")).toBe(true);
    expect(cssFontStack("Steelfish")).toContain("Steelfish");
  });
});

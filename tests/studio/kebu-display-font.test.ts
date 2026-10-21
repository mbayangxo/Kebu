import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STUDIO_FONTS_CATALOG, studioFontByFamily, cssStackForStudioFont } from "@/lib/studio/fonts-catalog";

describe("Kebu Display — the self-hosted built-in font entry", () => {
  it("is registered in the Studio font catalog with a real self-hosted stack", () => {
    const entry = studioFontByFamily("Kebu Display");
    expect(entry).toBeDefined();
    expect(entry!.googleFamily).toBe(""); // self-hosted, not Google Fonts
    expect(cssStackForStudioFont("Kebu Display")).toContain('"Kebu Display"');
  });

  it("does not collide with another catalog id or family name", () => {
    const ids = STUDIO_FONTS_CATALOG.map((f) => f.id);
    const families = STUDIO_FONTS_CATALOG.map((f) => f.family);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(families).size).toBe(families.length);
  });

  it("every static instance, the variable font, and the stylesheet the catalog entry depends on actually exist on disk", () => {
    const base = resolve(process.cwd(), "public/fonts/kebu-display");
    const styles = ["Light", "LightItalic", "Regular", "RegularItalic", "Bold", "BoldItalic"];
    for (const style of styles) {
      for (const ext of ["woff2", "ttf", "otf"]) {
        expect(existsSync(resolve(base, `KebuDisplay-${style}.${ext}`)), `KebuDisplay-${style}.${ext}`).toBe(true);
      }
    }
    expect(existsSync(resolve(base, "KebuDisplay-Variable.woff2"))).toBe(true);
    expect(existsSync(resolve(base, "KebuDisplay-Variable.ttf"))).toBe(true);
    expect(existsSync(resolve(base, "kebu-display.css"))).toBe(true);
  });

  it("the stylesheet declares all six static @font-face rules at the right weight/style", () => {
    const css = readFileSync(
      resolve(process.cwd(), "public/fonts/kebu-display/kebu-display.css"),
      "utf8",
    );
    for (const [weight, style, file] of [
      ["300", "normal", "KebuDisplay-Light.woff2"],
      ["300", "italic", "KebuDisplay-LightItalic.woff2"],
      ["400", "normal", "KebuDisplay-Regular.woff2"],
      ["400", "italic", "KebuDisplay-RegularItalic.woff2"],
      ["700", "normal", "KebuDisplay-Bold.woff2"],
      ["700", "italic", "KebuDisplay-BoldItalic.woff2"],
    ] as const) {
      const block = css.slice(css.indexOf(file) - 200, css.indexOf(file) + 50);
      expect(block, file).toContain(`font-weight: ${weight}`);
      expect(block, file).toContain(`font-style: ${style}`);
    }
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KEBU_SITE_RESPONSIVE_BREAKPOINTS,
  KEBU_SITE_ROOT_CLASS,
} from "@/lib/create/site-responsive";
import { fitDesignScale } from "@/lib/create/responsive-scale";

describe("platform site responsiveness", () => {
  it("exports a shared root class for every SiteRenderer site", () => {
    expect(KEBU_SITE_ROOT_CLASS).toBe("kebu-site");
    expect(KEBU_SITE_RESPONSIVE_BREAKPOINTS.mobileMax).toBe(640);
  });

  it("ships shared CSS that clips overflow and fluidizes media", () => {
    const css = readFileSync(
      resolve(process.cwd(), "app/components/create/kebu-site-responsive.css"),
      "utf8",
    );
    expect(css).toContain(".kebu-site");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain(".kebu-site-nav");
  });

  it("SiteRenderer mounts the shared root class and CSS", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/components/create/site-renderer.tsx"),
      "utf8",
    );
    expect(src).toContain("kebu-site-responsive.css");
    expect(src).toContain("KEBU_SITE_ROOT_CLASS");
    expect(src).toContain("kebu-site-nav");
  });

  it("scales fixed design canvases down to phone widths without upscaling", () => {
    expect(fitDesignScale(390, 1200)).toBeCloseTo(390 / 1200);
    expect(fitDesignScale(1400, 1200)).toBe(1);
  });
});

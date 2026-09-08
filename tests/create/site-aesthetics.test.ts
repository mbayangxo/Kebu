import { describe, expect, it } from "vitest";
import {
  matchSiteAesthetic,
  SITE_AESTHETICS,
  siteAestheticById,
  themeToCssVars,
  themeWithAesthetic,
} from "@/lib/create/site-aesthetics";
import { themeSchema } from "@/lib/create/website-schema";

describe("site aesthetics", () => {
  it("lists named looks with full theme tokens", () => {
    expect(SITE_AESTHETICS.length).toBeGreaterThanOrEqual(8);
    for (const look of SITE_AESTHETICS) {
      expect(look.theme.accent).toMatch(/^#/);
      expect(look.theme.background).toMatch(/^#/);
      expect(look.theme.fontDisplay).toBeTruthy();
      expect(look.theme.aestheticId).toBe(look.id);
    }
  });

  it("matches a look from applied theme colors and aestheticId", () => {
    const rose = siteAestheticById("rose-atelier");
    expect(rose).toBeTruthy();
    expect(matchSiteAesthetic(rose!.theme)).toBe("rose-atelier");
    expect(matchSiteAesthetic({ aestheticId: "dakar-night" })).toBe("dakar-night");
  });

  it("emits CSS variables so the site restyles, not only color pickers", () => {
    const theme = themeWithAesthetic("lagos-market");
    const vars = themeToCssVars(theme);
    expect(vars["--kebu-accent"]).toBe(theme.accent);
    expect(vars["--kebu-section-pad"]).toBe("2.25rem");
    expect(themeSchema.parse(theme).aestheticId).toBe("lagos-market");
  });
});

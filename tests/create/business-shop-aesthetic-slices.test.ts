import { describe, expect, it } from "vitest";
import { withShopOpened, projectShopOpened } from "@/lib/create/site-shop";
import { AESTHETIC_THEME_PRICE_USD_CENTS, formatAestheticThemePrice } from "@/lib/create/aesthetic-pricing";
import { getAestheticGalleryGroups } from "@/lib/create/aesthetics-gallery";
import { themeSchema } from "@/lib/create/website-schema";
import { themeToCssVars } from "@/lib/create/site-aesthetics";

describe("shop opt-in + aesthetic $5 + layout width", () => {
  it("opens shop on seo.commerce without implying products on site", () => {
    const seo = withShopOpened({ title: "Agency" }, "Agency");
    expect(projectShopOpened(seo)).toBe(true);
    expect(seo.commerce?.shopOpened).toBe(true);
    expect(seo.commerce?.shopOpenedAt).toBeTruthy();
  });

  it("prices gallery themes at $5", () => {
    expect(AESTHETIC_THEME_PRICE_USD_CENTS).toBe(500);
    expect(formatAestheticThemePrice()).toBe("$5");
    const groups = getAestheticGalleryGroups();
    expect(groups[0]?.items[0]?.priceCents).toBe(500);
    expect(groups[0]?.items[0]?.priceLabel).toBe("$5");
  });

  it("applies contentWidth to css vars", () => {
    const theme = themeSchema.parse({
      primary: "#111",
      accent: "#f50",
      background: "#fff",
      text: "#111",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      contentWidth: "narrow",
    });
    const vars = themeToCssVars(theme);
    expect(vars["--kebu-content-max"]).toBe("42rem");
  });
});

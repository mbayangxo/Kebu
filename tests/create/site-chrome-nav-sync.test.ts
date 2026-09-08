import { describe, expect, it } from "vitest";
import {
  defaultSiteChrome,
  navLinksFromPages,
  parseSiteChrome,
  withSyncedChromeNavLinks,
} from "@/lib/create/site-chrome";

describe("site chrome nav sync", () => {
  it("builds links from pages excluding home", () => {
    const links = navLinksFromPages([
      { slug: "home", title: "Home", sort_order: 0 },
      { slug: "shop", title: "Shop", sort_order: 1 },
      { slug: "about", title: "About", sort_order: 2 },
    ]);
    expect(links).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "About", href: "/about" },
    ]);
  });

  it("updates chrome header links when pages change", () => {
    const chrome = defaultSiteChrome("LAYERS");
    const next = withSyncedChromeNavLinks(chrome, [
      { slug: "home", title: "Home", sort_order: 0 },
      { slug: "gifts", title: "Gifts", sort_order: 1 },
    ]);
    expect(next.enabled).toBe(true);
    expect(next.header?.props.brand).toBe("LAYERS");
    expect(next.header?.props.links).toEqual([{ label: "Gifts", href: "/gifts" }]);
    expect(parseSiteChrome(next).header?.props.links).toHaveLength(1);
  });
});

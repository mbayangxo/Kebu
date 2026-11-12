import { describe, expect, it } from "vitest";
import {
  defaultSiteChrome,
  navLinksFromPages,
  parseSiteChrome,
  patchSiteChromePart,
  withSyncedChromeNavLinks,
} from "@/lib/create/site-chrome";

describe("site chrome nav sync", () => {
  it("builds links from pages excluding home", () => {
    const links = navLinksFromPages([
      { id: "home", slug: "home", title: "Home", sort_order: 0 },
      { id: "shop", slug: "shop", title: "Shop", sort_order: 1 },
      { id: "about", slug: "about", title: "About", sort_order: 2 },
    ]);
    expect(links).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "About", href: "/about" },
    ]);
  });

  it("derives nested links from persisted page hierarchy", () => {
    const links = navLinksFromPages([
      { id: "home", slug: "home", title: "Home", sort_order: 0 },
      { id: "shop", slug: "shop", title: "Shop", sort_order: 1 },
      { id: "new", slug: "new", title: "New arrivals", sort_order: 2, parent_id: "shop" },
      { id: "sale", slug: "sale", title: "Sale", sort_order: 3, parent_id: "shop" },
    ]);
    expect(links).toEqual([
      {
        label: "Shop",
        href: "/shop",
        children: [
          { label: "New arrivals", href: "/new" },
          { label: "Sale", href: "/sale" },
        ],
      },
    ]);
  });

  it("updates generated page links without destroying custom menu links", () => {
    const chrome = patchSiteChromePart(defaultSiteChrome("LAYERS"), "header", {
      links: [
        { label: "Old page", href: "/old-page" },
        { label: "Instagram", href: "https://instagram.com/layers" },
      ],
    });
    const next = withSyncedChromeNavLinks(chrome, [
      { id: "home", slug: "home", title: "Home", sort_order: 0 },
      { id: "gifts", slug: "gifts", title: "Gifts", sort_order: 1 },
    ]);
    expect(next.enabled).toBe(true);
    expect(next.header?.props.brand).toBe("LAYERS");
    expect(next.header?.props.links).toEqual([
      { label: "Gifts", href: "/gifts" },
      { label: "Old page", href: "/old-page" },
      { label: "Instagram", href: "https://instagram.com/layers" },
    ]);
    expect(parseSiteChrome(next).header?.props.links).toHaveLength(3);
  });
});

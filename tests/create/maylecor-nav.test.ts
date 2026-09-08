import { describe, expect, it } from "vitest";
import {
  defaultMaylecorNavLinks,
  navLinkHasDropdown,
  sanitizeMaylecorNavLinks,
} from "@/lib/create/maylecor-nav";

describe("sanitizeMaylecorNavLinks", () => {
  it("returns Shop / May's World with multi-nav children by default", () => {
    const nav = sanitizeMaylecorNavLinks([]);
    expect(nav.map((l) => l.href)).toEqual([
      "/shop",
      "/mays-world",
      "/updates",
      "/about",
      "/press",
      "https://forthemayjorgood.com",
    ]);
    const shop = nav.find((l) => l.href === "/shop")!;
    const world = nav.find((l) => l.href === "/mays-world")!;
    expect(shop.multiNav).toBe(true);
    expect(world.multiNav).toBe(true);
    expect(navLinkHasDropdown(shop)).toBe(true);
    expect(navLinkHasDropdown(world)).toBe(true);
    expect(world.children?.some((c) => c.href === "/music")).toBe(true);
    expect(world.children?.some((c) => c.href === "/may-by-may")).toBe(true);
    expect(world.children?.some((c) => c.href === "/mayinutes")).toBe(false);
    expect(defaultMaylecorNavLinks().find((l) => l.href === "/about")?.label).toBe("About May");
  });

  it("rewrites Mayinutes dropdown links to May by May", () => {
    const out = sanitizeMaylecorNavLinks([
      {
        label: "May's World",
        href: "/mays-world",
        multiNav: true,
        children: [
          { label: "Music", href: "/music" },
          { label: "Mayinutes", href: "/mayinutes" },
        ],
      },
    ]);
    const world = out.find((l) => l.href === "/mays-world")!;
    expect(world.children?.some((c) => c.href === "/may-by-may" && c.label === "May by May")).toBe(
      true,
    );
    expect(world.children?.some((c) => c.href === "/mayinutes")).toBe(false);
  });

  it("lets the user turn multi-nav off for a hub", () => {
    const out = sanitizeMaylecorNavLinks([
      { label: "Shop", href: "/shop", multiNav: false, children: [] },
      { label: "May's World", href: "/mays-world", multiNav: true },
      { label: "About May", href: "/about" },
      { label: "Press", href: "/press" },
      { label: "Mayjor Good", href: "/mayjor-good" },
    ]);
    expect(out.find((l) => l.href === "/shop")?.multiNav).toBe(false);
    expect(out.find((l) => l.href === "/shop")?.children).toEqual([]);
    expect(navLinkHasDropdown(out.find((l) => l.href === "/mays-world")!)).toBe(true);
  });

  it("rewrites Inquire / Contact to Mayjor Good", () => {
    const out = sanitizeMaylecorNavLinks([
      { label: "Shop", href: "/shop" },
      { label: "May's World", href: "/mays-world" },
      { label: "About", href: "/about" },
      { label: "Press", href: "/press" },
      { label: "Inquire", href: "/inquire" },
    ]);
    expect(out.some((l) => l.href === "https://forthemayjorgood.com" || l.href === "/mayjor-good")).toBe(
      true,
    );
    expect(out.some((l) => l.href === "/inquire")).toBe(false);
  });

  it("preserves custom dropdown children", () => {
    const out = sanitizeMaylecorNavLinks([
      {
        label: "Shop",
        href: "/shop",
        multiNav: true,
        children: [{ label: "Tees", href: "/shop" }],
      },
      { label: "About May", href: "/about" },
    ]);
    expect(out[0]?.children).toEqual([{ label: "Tees", href: "/shop", iconUrl: "" }]);
  });

  it("preserves nav photo icons and showLabel", () => {
    const out = sanitizeMaylecorNavLinks([
      {
        label: "Shop",
        href: "/shop",
        iconUrl: "/templates/maylecor/logo-stacked.png",
        showLabel: false,
      },
      { label: "Updates", href: "/updates", iconUrl: "", showLabel: true },
    ]);
    expect(out[0]?.iconUrl).toBe("/templates/maylecor/logo-stacked.png");
    expect(out[0]?.showLabel).toBe(false);
    expect(out.some((l) => l.href === "/updates")).toBe(true);
  });

  it("rewrites news / actus labels to Updates", () => {
    const out = sanitizeMaylecorNavLinks([
      { label: "News", href: "https://www.maylecor.com/news" },
    ]);
    expect(out.some((l) => l.href === "/updates")).toBe(true);
  });
});

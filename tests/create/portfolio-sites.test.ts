import { describe, expect, it } from "vitest";
import { PORTFOLIO_SITES } from "@/lib/create/portfolio-sites";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isOwnerPortfolioDescription } from "@/lib/create/go-live";
import { dklnsWebsiteDefinition } from "@/lib/create/dklns-site";
import { ndaoanWebsiteDefinition } from "@/lib/create/ndaoan-site";
import { rectWebsiteDefinition, RECT_LIME, RECT_ORANGE, RECT_BLACK } from "@/lib/create/rect-site";
import { mayjorGoodWebsiteDefinition } from "@/lib/create/mayjor-good-site";
import { siteAestheticById } from "@/lib/create/site-aesthetics";

describe("portfolio sites", () => {
  it("defines May Lecor, K-Direction, DkLNS, Ndaoan House, RECT, and For The Mayjor Good", () => {
    expect(PORTFOLIO_SITES.map((s) => s.key)).toEqual([
      "maylecor",
      "kdirection",
      "dklns",
      "ndaoan",
      "rect",
      "mayjorgood",
    ]);
  });

  it("marks descriptions as owner portfolio sites", () => {
    for (const site of PORTFOLIO_SITES) {
      expect(isOwnerPortfolioDescription(site.description)).toBe(true);
    }
    expect(isOwnerPortfolioDescription("generic agency site")).toBe(false);
  });

  it("builds valid website definitions for all portfolio templates", () => {
    for (const site of PORTFOLIO_SITES) {
      const def = definitionFromTemplateSlug(site.templateSlug, {
        mode: "template",
        businessId: "11111111-1111-4111-8111-111111111111",
        businessName: site.title,
        category: site.category,
        description: site.description,
        countryCode: site.countryCode,
        locale: "en",
        desiredPages: ["home"],
        templateSlug: site.templateSlug,
      });
      expect(def).not.toBeNull();
      const validated = validateWebsiteDefinition(def!);
      expect(validated.ok, validated.ok ? "" : validated.error).toBe(true);
      expect(def!.title).toBe(site.title);
    }
  });

  it("uses the correct aesthetic template slugs", () => {
    expect(PORTFOLIO_SITES.find((s) => s.key === "maylecor")?.templateSlug).toBe("musician-maylecor-ksendr");
    expect(PORTFOLIO_SITES.find((s) => s.key === "kdirection")?.templateSlug).toBe("agency-kdirection");
    expect(PORTFOLIO_SITES.find((s) => s.key === "dklns")?.templateSlug).toBe("agency-dklns");
    expect(PORTFOLIO_SITES.find((s) => s.key === "ndaoan")?.templateSlug).toBe("production-ndaoan-house");
    expect(PORTFOLIO_SITES.find((s) => s.key === "rect")?.templateSlug).toBe("entertainment-rect");
    expect(PORTFOLIO_SITES.find((s) => s.key === "mayjorgood")?.templateSlug).toBe(
      "foundation-mayjor-good",
    );
  });

  it("keeps custom DkLNS / Ndaoan heroes when applying template slug", () => {
    const dklns = definitionFromTemplateSlug("agency-dklns", {
      mode: "template",
      businessId: "11111111-1111-4111-8111-111111111111",
      businessName: "DkLNS",
      category: "agency",
      description: "portfolio:dklns — should not overwrite hero",
      countryCode: "SN",
      locale: "en",
      desiredPages: ["home"],
      templateSlug: "agency-dklns",
    });
    const hero = dklns?.pages[0]?.sections.find((s) => s.type === "hero");
    expect(hero?.props.subheading).toMatch(/Management\. Creative\. Content/);
    expect(String(hero?.props.subheading)).not.toContain("portfolio:dklns");
  });
});

describe("DkLNS and Ndaoan aesthetics", () => {
  it("validates unique agency and production definitions", () => {
    const d = validateWebsiteDefinition(dklnsWebsiteDefinition());
    const n = validateWebsiteDefinition(ndaoanWebsiteDefinition());
    expect(d.ok, d.ok ? "" : d.error).toBe(true);
    expect(n.ok, n.ok ? "" : n.error).toBe(true);
    expect(dklnsWebsiteDefinition().theme.aestheticId).toBe("dklns-lumen");
    expect(ndaoanWebsiteDefinition().theme.aestheticId).toBe("ndaoan-cinema");
  });

  it("registers named aesthetics for the builder panel", () => {
    expect(siteAestheticById("dklns-lumen")?.name).toBe("DkLNS Lumen");
    expect(siteAestheticById("ndaoan-cinema")?.name).toBe("Ndaoan Cinema");
  });

  it("mentions May Lecor signed and partner houses", () => {
    const blob = JSON.stringify(dklnsWebsiteDefinition());
    expect(blob).toMatch(/May Lecor/);
    expect(blob).toMatch(/Ndaoan House/);
    expect(blob).toMatch(/K-Direction/);
    const house = JSON.stringify(ndaoanWebsiteDefinition());
    expect(house).toMatch(/DkLNS/);
    expect(house).toMatch(/K-Direction/);
  });

  it("has Artists tab and personal May Lecor page with merch", () => {
    const def = dklnsWebsiteDefinition();
    const slugs = def.pages.map((p) => p.slug);
    expect(slugs).toContain("artists");
    expect(slugs).toContain("may-lecor");
    expect(slugs).toContain("may-lecor-build");
    expect(slugs).not.toContain("roster");
    const nav = def.pages[0]?.sections.find((s) => s.type === "navigation");
    const links = (nav?.props as { links?: { href: string; label: string }[] })?.links ?? [];
    expect(links.some((l) => l.href === "/artists" && l.label === "Artists")).toBe(true);
    const may = def.pages.find((p) => p.slug === "may-lecor");
    expect(may?.sections.some((s) => s.type === "products")).toBe(true);
    const artists = def.pages.find((p) => p.slug === "artists");
    const grid = artists?.sections.find((s) => s.id === "dklns-artists-grid");
    expect((grid?.props as { layout?: string })?.layout).toBe("moodboard");
    expect(
      ((grid?.props as { items?: { href?: string }[] })?.items ?? []).some(
        (i) => i.href === "/may-lecor",
      ),
    ).toBe(true);
    const desk = def.pages.find((p) => p.slug === "may-lecor-build");
    const blob = JSON.stringify(desk);
    expect(blob).toMatch(/LLC/i);
    expect(blob).toMatch(/Brainstorm/i);
    expect(blob).toMatch(/Business ideas/i);
  });
});

describe("RECT entertainment tech site", () => {
  it("validates RECT definition with brand colors", () => {
    const r = validateWebsiteDefinition(rectWebsiteDefinition());
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    const def = rectWebsiteDefinition();
    expect(def.theme.accent).toBe(RECT_LIME);
    expect(def.theme.background).toBe(RECT_BLACK);
    expect(def.theme.aestheticId).toBe("rect-signal");
    expect(JSON.stringify(def)).toContain(RECT_ORANGE);
    expect(siteAestheticById("rect-signal")?.name).toBe("RECT Signal");
  });

  it("covers music, label, film, watch, and social pages honestly", () => {
    const slugs = rectWebsiteDefinition().pages.map((p) => p.slug);
    expect(slugs).toEqual([
      "home",
      "music",
      "label",
      "film",
      "watch",
      "social",
      "company",
      "contact",
    ]);
    const blob = JSON.stringify(rectWebsiteDefinition());
    expect(blob).toMatch(/does not ship a fake player/i);
    expect(blob).toMatch(/Not another empty feed/i);
  });
});

describe("For The Mayjor Good foundation site", () => {
  it("validates foundation definition and mission pillars", () => {
    const m = validateWebsiteDefinition(mayjorGoodWebsiteDefinition());
    expect(m.ok, m.ok ? "" : m.error).toBe(true);
    const def = mayjorGoodWebsiteDefinition();
    expect(def.title).toBe("For The Mayjor Good");
    expect(def.theme.aestheticId).toBe("mayjor-grace");
    expect(siteAestheticById("mayjor-grace")?.name).toBe("Mayjor Grace");
    const blob = JSON.stringify(def);
    expect(blob).toMatch(/God.?s love/i);
    expect(blob).toMatch(/school supplies/i);
    expect(blob).toMatch(/talib/i);
    expect(blob).toMatch(/grocery/i);
    expect(blob).toMatch(/clinic/i);
    expect(blob).toMatch(/orphan/i);
    expect(blob).toMatch(/job opportunit/i);
    expect(blob).toMatch(/youth/i);
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "mission",
      "art",
      "opportunity",
      "service",
      "impact",
      "give",
      "contact",
    ]);
  });
});

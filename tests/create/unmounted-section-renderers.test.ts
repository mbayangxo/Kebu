/**
 * Regression for a confirmed live bug: the site renderer's render switch had no case
 * for "countdown", "social-proof", or "reviews" — three section types that are both
 * schema-defined (lib/create/website-schema.ts) and addable today via the Builder's
 * add-section picker (lib/create/builder-section-catalog.ts). A merchant who added any
 * of them got nothing on their published site (silent fall-through to `default: return
 * null`). This proves each now renders its real content, not a placeholder.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";

const PAGE_ID = "11111111-1111-4111-8111-111111111111";

function definitionWithSection(sectionType: string, props: Record<string, unknown>) {
  return buildEditorPreviewDefinition(
    { title: "Unmounted section test" },
    [{ id: PAGE_ID, slug: "home", title: "Home", sort_order: 0, device_layouts: null }],
    [{ id: "aaaaaaaa-0000-4000-8000-000000000001", page_id: PAGE_ID, section_type: sectionType, sort_order: 0, props }],
    null,
  );
}

function liveHtml(sectionType: string, props: Record<string, unknown>) {
  const definition = definitionWithSection(sectionType, props);
  return renderToStaticMarkup(
    createElement(SiteRenderer, { definition, mode: "live", pageSlug: "home", siteBase: "/sites/test", projectId: "p1" }),
  );
}

describe("site renderer — previously-missing section cases", () => {
  it("countdown: renders the real target-driven timer, not nothing", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const html = liveHtml("countdown", { heading: "Flash sale ends soon", target: future, layout: "hero" });
    expect(html).toContain("Flash sale ends soon");
    // The real component renders zero-padded DD/HH/MM/SS digits — distinct from an empty section.
    expect(html.length).toBeGreaterThan(200);
  });

  it("countdown: a past target renders the real expired message, not the timer", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const html = liveHtml("countdown", { target: past, expiredMessage: "SOLD OUT FOR REAL" });
    expect(html).toContain("SOLD OUT FOR REAL");
  });

  it("countdown: hidden=true renders nothing at all (not a leftover empty wrapper)", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const html = liveHtml("countdown", { target: future, hidden: true, heading: "Should not appear" });
    expect(html).not.toContain("Should not appear");
  });

  it("social-proof: renders the merchant-authored customer names, not a blank overlay", () => {
    const html = liveHtml("social-proof", {
      items: [{ name: "Awa", location: "Dakar", product: "Real Product Name", minutesAgo: 4 }],
    });
    expect(html).toContain("Awa");
    expect(html).toContain("Real Product Name");
  });

  it("social-proof: empty items array renders nothing (schema requires min 1, but a stripped/malformed section must not crash or show a fake default)", () => {
    const html = liveHtml("social-proof", { items: [] });
    expect(html).not.toContain("vient de commander");
  });

  it("reviews: with no productId configured, shows the honest 'configure a product' message, not a fake review", () => {
    const html = liveHtml("reviews", { heading: "Customer reviews" });
    expect(html).toContain("Customer reviews");
    expect(html).toContain("Configurez un produit");
  });

  it("reviews: hidden=true renders nothing", () => {
    const html = liveHtml("reviews", { heading: "Should not appear", hidden: true });
    expect(html).not.toContain("Should not appear");
  });

  it("products: layout='carousel' (a real, selectable schema option) renders a horizontal scroller, not a silently-downgraded grid", () => {
    const items = [
      { name: "Alpha Tee", priceLabel: "5000 XOF" },
      { name: "Beta Tee", priceLabel: "6000 XOF" },
    ];
    const carouselHtml = liveHtml("products", { layout: "carousel", items });
    const gridHtml = liveHtml("products", { layout: "grid", items });
    expect(carouselHtml).toContain("overflow-x-auto");
    expect(carouselHtml).toContain("snap-x");
    expect(gridHtml).not.toContain("overflow-x-auto");
    // Both still render the real product names — this is a layout fix, not a data change.
    expect(carouselHtml).toContain("Alpha Tee");
    expect(carouselHtml).toContain("Beta Tee");
  });
});

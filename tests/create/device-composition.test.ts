/**
 * Regression coverage for the Phase 3B device model (lib/create/device-composition.ts):
 *
 *   • Site chrome is structural: header first and footer last on every device, whatever
 *     the (possibly incomplete or malformed) device sectionOrder says.
 *   • Per-device visibility survives site-chrome composition (chrome on and off).
 *   • Published pages render ONE representation of each section. The server render is the
 *     Desktop composition in DOM order, with per-device CSS hooks for correct pre-hydration
 *     presentation; on the client the DOM is re-composed for the viewport's device, so DOM,
 *     screen-reader and keyboard order follow the visible order.
 *   • Each device's composition depends only on that device, across transitions in several
 *     directions. (Live DOM/focus behaviour is verified in the browser by
 *     tests/gate2/phase3b-responsive-dom.gate2.e2e.ts.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicSiteView } from "@/app/components/create/public-site-view";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { BUILDER_DEVICES, builderDeviceFromWidth, type BuilderDevice } from "@/lib/create/builder-device";
import {
  DEVICE_MAX_WIDTH_QUERIES,
  DEVICE_MEDIA_QUERIES,
  composeSectionsForDevice,
  deviceFromMediaMatches,
  isSectionVisibleOnDevice,
  orderPlanForDevice,
  orderSectionsForDevice,
  planResponsiveComposition,
} from "@/lib/create/device-composition";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { applySiteChromeToDefinition, CHROME_FOOTER_ID, CHROME_HEADER_ID, defaultSiteChrome, type SiteChrome } from "@/lib/create/site-chrome";
import type { PageDeviceLayouts } from "@/lib/create/website-extensions";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

// ── Fixture: four body sections with every kind of device override ───────────

const PAGE_ID = "11111111-1111-4111-8111-111111111111";
const IDS = {
  alpha: "aaaaaaaa-0000-4000-8000-000000000001",
  bravo: "aaaaaaaa-0000-4000-8000-000000000002",
  charlie: "aaaaaaaa-0000-4000-8000-000000000003",
  delta: "aaaaaaaa-0000-4000-8000-000000000004",
} as const;
type Key = keyof typeof IDS;
type Slot = Key | "header" | "footer";
const KEYS = Object.keys(IDS) as Key[];
const HEADING: Record<Key, string> = {
  alpha: "DC-ALPHA hero",
  bravo: "DC-BRAVO text",
  charlie: "DC-CHARLIE faq",
  delta: "DC-DELTA features",
};
const CHARLIE_TABLET_HEADING = "DC-CHARLIE tablet copy";

// Builder-saved orders list body sections only (never chrome).
const LAYOUTS = {
  tablet: { sectionOrder: [IDS.alpha, IDS.charlie, IDS.bravo, IDS.delta] },
  mobile: { sectionOrder: [IDS.bravo, IDS.alpha, IDS.charlie, IDS.delta] },
};

function apiSections(overrides = true) {
  return [
    { id: IDS.alpha, page_id: PAGE_ID, section_type: "hero", sort_order: 0, props: { heading: HEADING.alpha, subheading: "a" } },
    { id: IDS.bravo, page_id: PAGE_ID, section_type: "text", sort_order: 1, props: { heading: HEADING.bravo, body: "b" } },
    {
      id: IDS.charlie, page_id: PAGE_ID, section_type: "faq", sort_order: 2,
      props: {
        heading: HEADING.charlie,
        items: [{ question: "Q?", answer: "A." }],
        ...(overrides ? { deviceOverrides: { tablet: { heading: CHARLIE_TABLET_HEADING } } } : {}),
      },
    },
    {
      id: IDS.delta, page_id: PAGE_ID, section_type: "features", sort_order: 3,
      props: {
        heading: HEADING.delta,
        items: [{ title: "D", body: "d" }],
        ...(overrides ? { _visibility: { hideOn: ["mobile"] } } : {}),
      },
    },
  ];
}

function definition(chrome: SiteChrome | null, overrides = true, layouts: unknown = LAYOUTS): WebsiteDefinition {
  return buildEditorPreviewDefinition(
    { title: "Device composition" },
    [{ id: PAGE_ID, slug: "home", title: "Home", sort_order: 0, device_layouts: overrides ? layouts : null }],
    apiSections(overrides),
    chrome,
  );
}

const CHROME = () => defaultSiteChrome("Device composition");
const CHROME_MODES: [string, SiteChrome | null][] = [
  ["chrome on", CHROME()],
  ["chrome off", null],
];

/** Body order each device must show (computed from the fixture, not the implementation). */
function expectedBody(device: BuilderDevice, visibleOnly = true): Key[] {
  const order = device === "desktop" ? KEYS : LAYOUTS[device].sectionOrder.map((id) => KEYS.find((k) => IDS[k] === id)!);
  return visibleOnly && device === "mobile" ? order.filter((k) => k !== "delta") : order;
}
function expectedSlots(device: BuilderDevice, chrome: boolean, visibleOnly = true): Slot[] {
  const body = expectedBody(device, visibleOnly);
  return chrome ? ["header", ...body, "footer"] : body;
}
const slotOf = (id: string | undefined): Slot | undefined =>
  id === CHROME_HEADER_ID ? "header" : id === CHROME_FOOTER_ID ? "footer" : KEYS.find((k) => IDS[k] === id);
const slots = (sections: readonly { id?: string }[]) => sections.map((s) => slotOf(s.id)).filter((k): k is Slot => Boolean(k));

// ── Chrome pinning ───────────────────────────────────────────────────────────

describe("site chrome stays header-first / footer-last on every device", () => {
  const page = definition(CHROME()).pages[0];

  for (const device of BUILDER_DEVICES) {
    it(`${device}: header, device body order, footer`, () => {
      expect(slots(orderSectionsForDevice(page.sections, page.deviceLayouts, device))).toEqual(expectedSlots(device, true, false));
      expect(slots(composeSectionsForDevice(page.sections, page.deviceLayouts, device))).toEqual(expectedSlots(device, true));
    });
  }

  const MALFORMED: [string, unknown, Record<BuilderDevice, Key[]>][] = [
    ["incomplete order (unlisted body sections follow in base order)",
      { tablet: { sectionOrder: [IDS.delta] }, mobile: { sectionOrder: [IDS.charlie, IDS.alpha] } },
      { desktop: KEYS, tablet: ["delta", "alpha", "bravo", "charlie"], mobile: ["charlie", "alpha", "bravo", "delta"] }],
    ["chrome IDs listed in a device order are ignored",
      { tablet: { sectionOrder: [CHROME_FOOTER_ID, IDS.bravo, CHROME_HEADER_ID, IDS.alpha] } },
      { desktop: KEYS, tablet: ["bravo", "alpha", "charlie", "delta"], mobile: KEYS }],
    ["unknown, duplicate and non-string entries are ignored",
      { mobile: { sectionOrder: ["nope", IDS.delta, IDS.delta, 42, null, IDS.bravo] } },
      { desktop: KEYS, tablet: KEYS, mobile: ["delta", "bravo", "alpha", "charlie"] }],
    ["a non-array sectionOrder falls back to base order",
      { tablet: { sectionOrder: "alpha,bravo" }, mobile: { sectionOrder: { 0: IDS.delta } } },
      { desktop: KEYS, tablet: KEYS, mobile: KEYS }],
    ["an empty order falls back to base order",
      { tablet: { sectionOrder: [] }, mobile: {} },
      { desktop: KEYS, tablet: KEYS, mobile: KEYS }],
  ];
  for (const [label, layouts, expected] of MALFORMED) {
    it(label, () => {
      const p = definition(CHROME(), true, layouts).pages[0];
      for (const device of BUILDER_DEVICES) {
        expect(slots(orderSectionsForDevice(p.sections, p.deviceLayouts as PageDeviceLayouts, device)), device)
          .toEqual(["header", ...expected[device], "footer"]);
      }
    });
  }

  it("the published server render keeps header first and footer last in every device's CSS order", () => {
    const html = renderToStaticMarkup(createElement(PublicSiteView, { definition: definition(CHROME()), subdomain: "dc-test" }));
    for (const device of BUILDER_DEVICES) {
      const view = cssView(html, device);
      expect(view[0], device).toBe("header");
      expect(view.at(-1), device).toBe("footer");
    }
  });
});

// ── Model ────────────────────────────────────────────────────────────────────

describe("device composition model", () => {
  it("visibility combines the hidden flag, page hiddenSections and section hideOn/showOn", () => {
    const base = { id: "x", props: {} };
    expect(isSectionVisibleOnDevice({ ...base, props: { hidden: true } }, undefined, "desktop")).toBe(false);
    expect(isSectionVisibleOnDevice(base, { mobile: { hiddenSections: ["x"] } }, "mobile")).toBe(false);
    expect(isSectionVisibleOnDevice(base, { mobile: { hiddenSections: ["x"] } }, "tablet")).toBe(true);
    expect(isSectionVisibleOnDevice({ ...base, visibility: { hideOn: ["tablet"] } }, undefined, "tablet")).toBe(false);
    expect(isSectionVisibleOnDevice({ ...base, visibility: { showOn: ["desktop"] } }, undefined, "mobile")).toBe(false);
    expect(isSectionVisibleOnDevice({ ...base, visibility: { showOn: ["desktop"] } }, undefined, "desktop")).toBe(true);
  });

  it("the plan has one item per section — content overrides are not duplicated", () => {
    const page = definition(CHROME()).pages[0];
    const plan = planResponsiveComposition(page.sections, page.deviceLayouts);
    expect(plan).toMatchObject({ reorders: true, varies: true });
    const ids = plan.items.map((i) => i.section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(slots(plan.items.map((i) => i.section))).toEqual(expectedSlots("desktop", true, false));
    expect(plan.items.find((i) => i.section.id === IDS.delta)?.showOn).toEqual(["desktop", "tablet"]);
  });

  for (const device of BUILDER_DEVICES) {
    it(`client DOM order on ${device} is that device's composition`, () => {
      const page = definition(CHROME()).pages[0];
      const plan = planResponsiveComposition(page.sections, page.deviceLayouts);
      expect(slots(orderPlanForDevice(plan.items, device).map((i) => i.section))).toEqual(expectedSlots(device, true, false));
    });
  }

  it("a page without device overrides needs no responsive machinery", () => {
    const page = definition(null, false).pages[0];
    const plan = planResponsiveComposition(page.sections, undefined);
    expect(plan).toMatchObject({ reorders: false, varies: false });
    expect(plan.items).toHaveLength(4);
  });
});

// ── Transitions ──────────────────────────────────────────────────────────────

describe("device transitions — each device's composition depends only on that device", () => {
  const def = definition(CHROME());
  const page = def.pages[0];
  const PATHS: BuilderDevice[][] = [
    ["desktop", "tablet", "mobile", "desktop"],
    ["mobile", "tablet", "desktop", "mobile"],
    ["tablet", "mobile", "tablet", "desktop", "tablet"],
    ["mobile", "desktop", "tablet", "mobile", "mobile"],
  ];
  for (const path of PATHS) {
    it(`model follows ${path.join(" → ")}`, () => {
      for (const device of path) expect(slots(composeSectionsForDevice(page.sections, page.deviceLayouts, device)), device).toEqual(expectedSlots(device, true));
    });
    it(`editor canvas render follows ${path.join(" → ")}`, () => {
      for (const device of path) {
        const html = renderToStaticMarkup(createElement(SiteRenderer, { definition: def, mode: "preview", pageSlug: "home", editor: { editDevice: device } }));
        const order = [...html.matchAll(/data-section-id="([^"]+)"/g)].map((m) => slotOf(m[1])).filter((k): k is Slot => Boolean(k));
        expect(order, device).toEqual(expectedSlots(device, true));
        expect(html, device).toContain(device === "tablet" ? CHARLIE_TABLET_HEADING : HEADING.charlie);
      }
    });
  }
});

// ── Site chrome must not strip section extensions ────────────────────────────

describe("site chrome composition preserves section extensions", () => {
  it("visibility, motion and a11y survive applySiteChromeToDefinition", () => {
    const motion = { specs: [], reducedMotionFallback: "instant" as const };
    const base = definition(null);
    base.pages[0].sections[3] = { ...base.pages[0].sections[3], motion, a11y: { label: "Delta features" } };
    const composed = applySiteChromeToDefinition(base, CHROME());
    const delta = composed.pages[0].sections.find((s) => s.id === IDS.delta)!;
    expect(delta.visibility).toEqual({ hideOn: ["mobile"] });
    expect(delta.motion).toEqual(motion);
    expect(delta.a11y).toEqual({ label: "Delta features" });
    for (const s of composed.pages[0].sections) {
      expect(s).not.toHaveProperty("section_type");
      expect(s).not.toHaveProperty("sort_order");
    }
  });

  for (const [label, chrome] of CHROME_MODES) {
    it(`${label}: Phone hides the section, Desktop and Tablet keep it`, () => {
      const page = definition(chrome).pages[0];
      for (const device of BUILDER_DEVICES) {
        const shown = composeSectionsForDevice(page.sections, page.deviceLayouts, device).some((s) => s.id === IDS.delta);
        expect(shown, device).toBe(device !== "mobile");
      }
    });
  }
});

// ── Published rendering path (PublicSiteView — what /sites/{subdomain} serves) ──

type Item = { hiddenOn: BuilderDevice[]; order: Record<BuilderDevice, number> | null; slot: Slot | undefined; text: string };

function publishedItems(html: string): Item[] {
  const parts = html.split(/<div class="(kebu-device-item[^"]*)"(?: style="([^"]*)")?>/);
  const items: Item[] = [];
  for (let i = 1; i < parts.length; i += 3) {
    const classes = parts[i].split(/\s+/);
    const style = parts[i + 1] ?? "";
    const orderOf = (d: BuilderDevice) => Number(style.match(new RegExp(`--kd-order-${d}:\\s*(\\d+)`))?.[1] ?? NaN);
    const text = parts[i + 2];
    const slot: Slot | undefined = text.includes("kebu-site-nav") ? "header"
      : KEYS.find((k) => text.includes(HEADING[k]) || (k === "charlie" && text.includes(CHARLIE_TABLET_HEADING)))
        ?? (/<footer/.test(text) ? "footer" : undefined);
    items.push({
      hiddenOn: BUILDER_DEVICES.filter((d) => classes.includes(`kebu-device-hide-${d}`)),
      order: style ? { desktop: orderOf("desktop"), tablet: orderOf("tablet"), mobile: orderOf("mobile") } : null,
      slot,
      text,
    });
  }
  return items;
}

/** Pre-hydration (or no-JS) presentation of `device`, following app/globals.css. */
function cssView(html: string, device: BuilderDevice): Slot[] {
  return publishedItems(html)
    .map((item, docIndex) => ({ item, docIndex }))
    .filter(({ item }) => !item.hiddenOn.includes(device))
    .sort((a, b) => a.item.order![device] - b.item.order![device] || a.docIndex - b.docIndex)
    .map(({ item }) => item.slot)
    .filter((s): s is Slot => Boolean(s));
}

describe("published site — single representation, correct before and after hydration", () => {
  for (const [label, chrome] of CHROME_MODES) {
    describe(label, () => {
      const html = renderToStaticMarkup(createElement(PublicSiteView, { definition: definition(chrome), subdomain: "dc-test" }));

      it("renders each section exactly once, in Desktop DOM order", () => {
        const domOrder = publishedItems(html).map((i) => i.slot);
        expect(domOrder).toEqual(expectedSlots("desktop", Boolean(chrome), false));
        for (const k of KEYS) expect(html.split(HEADING[k]).length - 1, k).toBe(1);
        expect(html).not.toContain(CHARLIE_TABLET_HEADING); // server render is the Desktop composition
      });

      for (const device of BUILDER_DEVICES) {
        it(`${device}: pre-hydration CSS presentation matches the device composition`, () => {
          expect(cssView(html, device)).toEqual(expectedSlots(device, Boolean(chrome)));
        });
      }
    });
  }

  it("a site without device overrides renders exactly as before (no responsive wrappers)", () => {
    for (const [, chrome] of CHROME_MODES) {
      const html = renderToStaticMarkup(createElement(PublicSiteView, { definition: definition(chrome, false), subdomain: "dc-test" }));
      expect(html).not.toContain("kebu-device-");
      for (const k of KEYS) expect(html).toContain(HEADING[k]);
    }
  });
});

// ── Breakpoints: CSS, matchMedia and builderDeviceFromWidth agree ─────────────

describe("published breakpoints match builderDeviceFromWidth", () => {
  const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
  const WIDTHS = [320, 390, 640, 641, 768, 1024, 1025, 1440];

  it("each hide class is scoped to its device media query", () => {
    for (const device of BUILDER_DEVICES) {
      const block = css.split(`@media ${DEVICE_MEDIA_QUERIES[device]}`)[1];
      expect(block, device).toBeDefined();
      expect(block!.slice(0, block!.indexOf("}\n}") + 1), device).toContain(`.kebu-device-hide-${device}`);
    }
  });

  it("CSS ranges, matchMedia queries and builderDeviceFromWidth classify every width identically", () => {
    const inCssRange = (device: BuilderDevice, w: number) =>
      device === "mobile" ? w <= 640 : device === "tablet" ? w > 640 && w <= 1024 : w > 1024;
    expect(DEVICE_MEDIA_QUERIES).toEqual({ mobile: "(width <= 640px)", tablet: "(640px < width <= 1024px)", desktop: "(width > 1024px)" });
    for (const w of WIDTHS) {
      const expected = builderDeviceFromWidth(w);
      expect(BUILDER_DEVICES.filter((d) => inCssRange(d, w)), `${w}px css`).toEqual([expected]);
      const matches = (q: string) => (q === DEVICE_MAX_WIDTH_QUERIES.mobile ? w <= 640 : q === DEVICE_MAX_WIDTH_QUERIES.tablet ? w <= 1024 : false);
      expect(deviceFromMediaMatches(matches), `${w}px matchMedia`).toBe(expected);
    }
  });
});

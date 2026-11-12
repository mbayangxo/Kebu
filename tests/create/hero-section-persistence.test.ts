/**
 * Standard Hero (`hero`) — every Builder control persists through save and publish.
 *
 * Defects covered (docs/product/PHASE-3B-QA-SIGNOFF.md):
 *   H1 — Height: the `hero` props schema did not declare `minHeight`, so the Builder's Height
 *        choice was stripped on save/publish and every Hero rendered at 80vh. New Heroes now
 *        default to an explicit "auto" (fits content); Heroes with no stored height keep 80vh.
 *   H2 — Background image and overlay opacity: written by the inspector, read by the renderer,
 *        stripped by the schema.
 *   H3 — Text align edited on Tablet/Phone was stored as a device override the renderer ignored.
 *   H4 — The Aesthetic Editor's "Hero background photo" wrote `backgroundImage`, which the
 *        standard Hero neither stores nor renders.
 *
 * Exercised at the real boundaries: the PATCH and POST /sections handlers (real schema and
 * defaults, database stubbed) and the published render of the stored props.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { deviceScopedPatch } from "@/lib/create/device-overrides";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import {
  HERO_HEIGHTS,
  HERO_HEIGHT_OPTIONS,
  LEGACY_HERO_HEIGHT,
  heroBackgroundPatch,
  heroBackgroundSwatch,
  heroContentPaddingClass,
  heroMinHeightCss,
  heroPropsForCopy,
  normalizeLegacyHeroProps,
  resolveHeroHeight,
} from "@/lib/create/hero-section";
import { sectionPropsSchemas, validateWebsiteDefinition } from "@/lib/create/website-schema";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const SECTION_ID = "33333333-3333-4333-8333-333333333333";
const PHOTO = "https://skqnxyaeimvbyrmdfzvk.supabase.co/storage/v1/object/public/site-assets/u/p/section-1.jpg";

// ── Route harness: real handlers + real schema/defaults, database stubbed ─────

const db = vi.hoisted(() => ({
  props: {} as Record<string, unknown>,
  lastUpdate: null as Record<string, unknown> | null,
  lastInsert: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ user: { id: "owner-1", email: "owner@test.invalid" }, supabase: {} }),
  logCreate: () => {},
}));

vi.mock("@/lib/create/project-access", () => {
  function table(name: string) {
    const q: Record<string, unknown> = {};
    let pendingUpdate: Record<string, unknown> | null = null;
    let pendingInsert: Record<string, unknown> | null = null;
    const chain = () => q;
    q.select = chain;
    q.eq = chain;
    q.is = chain; // 3C: `.is("parent_id", null)` — every fixture row is a page root
    q.order = chain;
    q.update = (payload: Record<string, unknown>) => {
      if (name === "project_sections") pendingUpdate = payload;
      return q;
    };
    q.insert = (payload: Record<string, unknown>) => {
      pendingInsert = payload;
      return q;
    };
    q.maybeSingle = async () => {
      if (name === "project_sections") return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: "hero", props: db.props, sort_order: 0 } };
      if (name === "project_pages") return { data: { id: PAGE_ID, project_id: PROJECT_ID } };
      return { data: null };
    };
    q.single = async () => {
      if (pendingInsert) {
        db.lastInsert = pendingInsert;
        return { data: { id: SECTION_ID, ...pendingInsert }, error: null };
      }
      db.lastUpdate = pendingUpdate;
      if (pendingUpdate?.props) db.props = pendingUpdate.props as Record<string, unknown>;
      return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: "hero", sort_order: 0, props: db.props }, error: null };
    };
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return q;
  }
  return {
    assertProjectEditorAccess: async () => ({ project: { id: PROJECT_ID, owner_id: "owner-1" }, via: "owner" }),
    dbForProjectAccess: () => ({ from: table }),
  };
});

async function patchHero(props: Record<string, unknown>) {
  const { PATCH } = await import("@/app/api/projects/[id]/sections/route");
  const res = await PATCH(
    new Request(`http://localhost/api/projects/${PROJECT_ID}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: SECTION_ID, props }),
    }),
    { params: Promise.resolve({ id: PROJECT_ID }) },
  );
  expect(res.status, await res.clone().text()).toBe(200);
  return db.props;
}

async function addHero(props?: Record<string, unknown>) {
  const { POST } = await import("@/app/api/projects/[id]/sections/route");
  const res = await POST(
    new Request(`http://localhost/api/projects/${PROJECT_ID}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "hero", pageSlug: "home", ...(props ? { props } : {}) }),
    }),
    { params: Promise.resolve({ id: PROJECT_ID }) },
  );
  expect(res.status, await res.clone().text()).toBe(201);
  return db.lastInsert?.props as Record<string, unknown>;
}

/** Publish the stored props (real definition build + publish validation) and render the live page. */
function publishedHtml(props: Record<string, unknown>, editDevice?: "tablet" | "mobile"): string {
  const def = buildDefinitionFromProjectParts(
    { title: "Hero", theme: {} as never },
    [{ id: PAGE_ID, slug: "home", title: "Home", sort_order: 0 }],
    [{ id: SECTION_ID, page_id: PAGE_ID, section_type: "hero", sort_order: 0, props }],
  );
  const published = validateWebsiteDefinition(def);
  if (!published.ok) throw new Error(published.error);
  return renderToStaticMarkup(
    editDevice
      ? createElement(SiteRenderer, { definition: published.data, mode: "preview", pageSlug: "home", editor: { editDevice } })
      : createElement(SiteRenderer, { definition: published.data, mode: "live", pageSlug: "home" }),
  );
}

function heroTag(html: string): string {
  const m = /<section[^>]*data-hero-height="[^"]*"[^>]*>/.exec(html);
  if (!m) throw new Error("hero section not rendered");
  return m[0];
}

const LEGACY = { heading: "LEGACY-HERO", subheading: "Saved before heights were stored", buttonLabel: "Go", buttonHref: "#", align: "center" };

beforeEach(() => {
  db.props = { ...LEGACY };
  db.lastUpdate = null;
  db.lastInsert = null;
});

// ── H1: height ───────────────────────────────────────────────────────────────

describe("H1 — Hero height is a deliberate, persisted choice", () => {
  it("the Builder offers Auto plus the existing Half / Tall / Hero / Full screen options", () => {
    expect(HERO_HEIGHT_OPTIONS.map((o) => o.value)).toEqual(["auto", "50vh", "70vh", "80vh", "100vh"]);
    expect(HERO_HEIGHTS).toEqual(["auto", "50vh", "70vh", "80vh", "100vh"]);
  });

  it("a Hero added in the Builder is stored with an explicit Auto height (not a missing field)", async () => {
    const stored = await addHero();
    expect(stored.minHeight).toBe("auto");
    const tag = heroTag(publishedHtml(stored));
    expect(tag).toContain('data-hero-height="auto"');
    expect(tag).not.toContain("min-height");
  });

  it("an explicit height sent when adding a Hero is kept", async () => {
    expect((await addHero({ heading: "Tall one", minHeight: "100vh" })).minHeight).toBe("100vh");
  });

  for (const height of HERO_HEIGHTS) {
    it(`"${height}" survives PATCH → stored props → publish → render`, async () => {
      const stored = await patchHero({ minHeight: height });
      expect(stored.minHeight).toBe(height);
      const tag = heroTag(publishedHtml(stored));
      expect(tag).toContain(`data-hero-height="${height}"`);
      if (height === "auto") expect(tag).not.toContain("min-height");
      else expect(tag).toContain(`min-height:${height}`);
    });
  }

  it("a legacy Hero (no stored height) still renders at 80vh after an unrelated edit — existing sites do not change", async () => {
    const stored = await patchHero({ heading: "Edited heading" });
    expect("minHeight" in stored && stored.minHeight !== undefined).toBe(false);
    expect(heroTag(publishedHtml(stored))).toContain(`min-height:${LEGACY_HERO_HEIGHT}`);
    expect(resolveHeroHeight(undefined)).toBe("80vh");
  });

  it("Auto is a content-sized band with balanced, device-stepped padding; explicit and legacy heights keep the bottom-anchored layout", () => {
    const content = (html: string) => /<div class="(relative z-10 w-full[^"]*)"/.exec(html)?.[1] ?? "";
    const auto = content(publishedHtml({ ...LEGACY, minHeight: "auto" }));
    expect(auto).toContain("py-16 sm:py-20 lg:py-24");
    expect(auto).not.toMatch(/\bpt-32\b|\bpb-16\b/);
    for (const height of ["50vh", "70vh", "80vh", "100vh"] as const) {
      expect(content(publishedHtml({ ...LEGACY, minHeight: height }))).toContain("pb-16 pt-32");
    }
    expect(content(publishedHtml({ ...LEGACY })), "legacy Hero unchanged").toContain("pb-16 pt-32");
    expect(heroContentPaddingClass("auto")).toBe("py-16 sm:py-20 lg:py-24");
  });

  it("duplicating a legacy Hero keeps its 80vh (the copy is not given the new-Hero default)", async () => {
    const copy = await addHero(heroPropsForCopy({ ...LEGACY }));
    expect(copy.minHeight).toBe("80vh");
    expect(heroTag(publishedHtml(copy))).toContain("min-height:80vh");
  });

  it("duplicating an Auto Hero stays Auto", async () => {
    expect((await addHero(heroPropsForCopy({ ...LEGACY, minHeight: "auto" }))).minHeight).toBe("auto");
  });

  it("an unsupported stored height is dropped (legacy height) instead of failing the save", async () => {
    const stored = await patchHero({ minHeight: "37px" });
    expect(stored.minHeight).toBeUndefined();
    expect(heroMinHeightCss(resolveHeroHeight(stored.minHeight))).toBe("80vh");
  });
});

// ── H2: background image and overlay opacity ─────────────────────────────────

describe("H2 — Hero background image and overlay opacity persist and publish", () => {
  it("an uploaded background image survives PATCH and is rendered on the published page", async () => {
    const stored = await patchHero({ image: PHOTO });
    expect(stored.image).toBe(PHOTO);
    expect(publishedHtml(stored)).toContain(`src="${PHOTO}"`);
  });

  it("removing the image (\"\") persists and the published Hero has no photo", async () => {
    db.props = { ...LEGACY, image: PHOTO };
    const stored = await patchHero({ image: "" });
    expect(stored.image).toBe("");
    expect(publishedHtml(stored)).not.toContain(PHOTO);
  });

  for (const overlay of [0, 0.65, 0.9]) {
    it(`overlay opacity ${overlay} survives PATCH and drives the published overlay`, async () => {
      db.props = { ...LEGACY, image: PHOTO };
      const stored = await patchHero({ overlayOpacity: overlay });
      expect(stored.overlayOpacity).toBe(overlay);
      expect(publishedHtml(stored)).toContain(`rgba(0,0,0,${(overlay + 0.28).toFixed(2)}) 0%`);
    });
  }

  it("unset overlay keeps the renderer's 0.42 default", () => {
    expect(publishedHtml({ ...LEGACY, image: PHOTO })).toContain(`rgba(0,0,0,${(0.42 + 0.28).toFixed(2)}) 0%`);
  });

  it("an out-of-range overlay or a non-image URL is dropped, not stored", async () => {
    const stored = await patchHero({ overlayOpacity: 5, image: "not a url" });
    expect(stored.overlayOpacity).toBeUndefined();
    expect(stored.image).toBeUndefined();
  });
});

// ── H3: device-scoped text align ─────────────────────────────────────────────

describe("H3 — text align edited on Tablet/Phone is stored per device and rendered", () => {
  it("a Phone align edit persists as a Phone override and renders left-aligned only on Phone", async () => {
    const patch = deviceScopedPatch("hero", { ...LEGACY }, "mobile", { align: "left" });
    expect(patch.align).toBeUndefined();
    const stored = await patchHero(patch);
    expect((stored.deviceOverrides as { mobile?: { align?: string } }).mobile?.align).toBe("left");
    expect(stored.align).toBe("center");
    const desktop = publishedHtml(stored);
    const phone = publishedHtml(stored, "mobile");
    expect(desktop).toMatch(/class="relative z-10[^"]*text-center/);
    expect(phone).not.toMatch(/class="relative z-10[^"]*text-center/);
    expect(publishedHtml(stored, "tablet")).toMatch(/class="relative z-10[^"]*text-center/);
  });
});

// ── H4: Aesthetic Editor hero background ─────────────────────────────────────

describe("H4 — the Aesthetic Editor's Hero background photo reaches the standard Hero", () => {
  it("a photo is written to `image`, which persists and renders", async () => {
    const patch = heroBackgroundPatch(PHOTO);
    expect(patch).toEqual({ image: PHOTO });
    const stored = await patchHero(patch);
    expect(publishedHtml(stored)).toContain(`src="${PHOTO}"`);
  });

  it("a color is written to `background`", () => {
    expect(heroBackgroundPatch("#123456")).toEqual({ background: "#123456" });
  });

  it("the inspector color swatch shows the color the Hero renders with", () => {
    expect(heroBackgroundSwatch("#abcdef", "#0F0D33")).toBe("#abcdef");
    expect(heroBackgroundSwatch(undefined, "#0F0D33")).toBe("#0F0D33");
    expect(heroBackgroundSwatch("#fff", "#0F0D33")).toBe("#ffffff");
  });
});

// ── T1: legacy template Hero fields ──────────────────────────────────────────

type LegacyHero = { template: string; props: Record<string, unknown> };
const LEGACY_KEYS = ["backgroundImageUrl", "overlay", "primaryCta", "secondaryCta"];
const legacyTemplateHeroes: LegacyHero[] = TEMPLATE_SEEDS.flatMap((t) =>
  t.definition.pages.flatMap((page) =>
    page.sections
      .filter((sec) => sec.type === "hero" && LEGACY_KEYS.some((k) => k in (sec.props as Record<string, unknown>)))
      .map((sec) => ({ template: t.slug, props: sec.props as Record<string, unknown> })),
  ),
);

describe("T1 — legacy template Hero fields are normalized to the canonical model", () => {
  it("the audit's 39 template Heroes are all reachable from the template registry", () => {
    expect(legacyTemplateHeroes.length).toBe(39);
  });

  it("every legacy shape in the repository is one the normalizer handles", () => {
    for (const { template, props } of legacyTemplateHeroes) {
      if ("backgroundImageUrl" in props) expect(typeof props.backgroundImageUrl, template).toBe("string");
      if ("overlay" in props) expect(typeof props.overlay, template).toBe("number");
      for (const k of ["primaryCta", "secondaryCta"]) {
        if (k in props) expect(Object.keys(props[k] as object).sort(), `${template} ${k}`).toEqual(["href", "label"]);
      }
    }
  });

  it("template instantiation (the save schema) keeps each template's image and overlay", () => {
    for (const { template, props } of legacyTemplateHeroes) {
      const saved = sectionPropsSchemas.hero.parse(props) as Record<string, unknown>;
      expect(saved.image, template).toBe(props.backgroundImageUrl);
      expect(saved.overlayOpacity, template).toBe(props.overlay);
    }
  });

  it("templates with primaryCta publish their own button, not the \"Get started\" default", () => {
    const withCta = legacyTemplateHeroes.filter((h) => h.props.primaryCta);
    expect(withCta.length).toBe(2);
    for (const { template, props } of withCta) {
      const cta = props.primaryCta as { label: string; href: string };
      const saved = sectionPropsSchemas.hero.parse(props) as Record<string, unknown>;
      expect({ label: saved.buttonLabel, href: saved.buttonHref }, template).toEqual(cta);
      const html = publishedHtml(props);
      expect(html, template).toContain(`href="${cta.href.replace(/&/g, "&amp;")}"`);
      expect(html, template).toContain(cta.label);
      expect(html, template).not.toContain("Get started");
    }
  });

  it("a legacy background image (same shape, non-empty) renders with its overlay on the published page", () => {
    const html = publishedHtml({ ...LEGACY, backgroundImageUrl: PHOTO, overlay: 0.6 });
    expect(html).toContain(`src="${PHOTO}"`);
    expect(html).toContain(`rgba(0,0,0,${(0.6 + 0.28).toFixed(2)}) 0%`);
  });

  it("legacy values survive an edit: stored legacy props + PATCH → canonical props → publish", async () => {
    db.props = { heading: "Legacy template hero", subheading: "s", backgroundImageUrl: PHOTO, overlay: 0.35, primaryCta: { label: "Voir", href: "/produits" } };
    const stored = await patchHero({ heading: "Edited in the Builder" });
    expect(stored).toMatchObject({ heading: "Edited in the Builder", image: PHOTO, overlayOpacity: 0.35, buttonLabel: "Voir", buttonHref: "/produits" });
    const html = publishedHtml(stored);
    expect(html).toContain(`src="${PHOTO}"`);
    expect(html).toContain("Voir");
  });

  it("a canonical value always wins over a template's legacy value", () => {
    const out = normalizeLegacyHeroProps({ image: "", backgroundImageUrl: PHOTO, overlayOpacity: 0.1, overlay: 0.7, buttonLabel: "Mine", primaryCta: { label: "Theirs", href: "/x" } }) as Record<string, unknown>;
    expect(out).toMatchObject({ image: "", overlayOpacity: 0.1, buttonLabel: "Mine", buttonHref: "/x" });
  });

  it("does not mutate its input (template definitions are never rewritten)", () => {
    const input = { heading: "h", backgroundImageUrl: "", overlay: 0.4 };
    const copy = JSON.parse(JSON.stringify(input));
    normalizeLegacyHeroProps(input);
    expect(input).toEqual(copy);
  });
});

// ── Add / Duplicate use the same save boundary as PATCH and Undo/Redo ────────
describe("POST /sections (Add, Duplicate) passes the canonical save boundary", () => {
  it("a duplicated Hero keeps its validated extension keys (responsive visibility, motion)", async () => {
    const copy = await addHero(heroPropsForCopy({ ...LEGACY, _visibility: { hideOn: ["mobile"] }, _motion: { specs: [], reducedMotionFallback: "none" } }));
    expect(copy._visibility).toEqual({ hideOn: ["mobile"] });
    expect(copy._motion).toEqual({ specs: [], reducedMotionFallback: "none" });
  });

  it("unsafe content is rejected when a section is added, as it is on every other save", async () => {
    const { POST } = await import("@/app/api/projects/[id]/sections/route");
    db.lastInsert = null;
    const res = await POST(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "hero", pageSlug: "home", props: { ...LEGACY, heading: "<script>alert(1)</script>" } }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(400);
    expect(db.lastInsert).toBeNull();
  });
});

/**
 * O6 — template secondary calls-to-action and the editorial-hero legacy template shape.
 *
 * Audit (every `secondaryCta` in the repository): 37 template sections, all `{ label, href }`
 * strings — 36 `editorial-hero`, 1 standard `hero`. The 36 editorial-hero sections (and one more in
 * the same templates) also use `backgroundImageUrl`, `overlay`, `textAlign`, `eyebrow` and
 * `primaryCta`; the editorial-hero schema knew none of them, so creating a site from those
 * templates dropped every button, the eyebrow, the overlay and the alignment.
 *
 * Real schema, real PATCH handler (database stubbed), real publish validation and renderer.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { deviceScopedPatch } from "@/lib/create/device-overrides";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { normalizeLegacyEditorialHeroProps } from "@/lib/create/editorial-hero-section";
import { normalizeLegacyHeroProps } from "@/lib/create/hero-section";
import { sectionPropsSchemas, validateWebsiteDefinition } from "@/lib/create/website-schema";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const SECTION_ID = "33333333-3333-4333-8333-333333333333";

const db = vi.hoisted(() => ({ type: "editorial-hero", props: {} as Record<string, unknown> }));

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ user: { id: "owner-1", email: "owner@test.invalid" }, supabase: {} }),
  logCreate: () => {},
}));

vi.mock("@/lib/create/project-access", () => {
  function table(name: string) {
    const q: Record<string, unknown> = {};
    let pendingUpdate: Record<string, unknown> | null = null;
    q.select = () => q;
    q.eq = () => q;
    q.is = () => q; // 3C: `.is("parent_id", null)` — every fixture row is a page root
    q.order = () => q;
    q.update = (payload: Record<string, unknown>) => {
      if (name === "project_sections") pendingUpdate = payload;
      return q;
    };
    q.maybeSingle = async () => {
      if (name === "project_sections") return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: db.type, props: db.props, sort_order: 0 } };
      if (name === "project_pages") return { data: { id: PAGE_ID, project_id: PROJECT_ID } };
      return { data: null };
    };
    q.single = async () => {
      if (pendingUpdate?.props) db.props = pendingUpdate.props as Record<string, unknown>;
      return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: db.type, sort_order: 0, props: db.props }, error: null };
    };
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return q;
  }
  return {
    assertProjectEditorAccess: async () => ({ project: { id: PROJECT_ID, owner_id: "owner-1" }, via: "owner" }),
    dbForProjectAccess: () => ({ from: table }),
  };
});

async function patch(props: Record<string, unknown>) {
  const { PATCH } = await import("@/app/api/projects/[id]/sections/route");
  const res = await PATCH(
    new Request(`http://localhost/api/projects/${PROJECT_ID}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: SECTION_ID, props }),
    }),
    { params: Promise.resolve({ id: PROJECT_ID }) },
  );
  return { status: res.status, props: db.props };
}

/** Publish one section (real definition build + publish validation) and render the live page. */
function publishedHtml(type: string, props: Record<string, unknown>, editDevice?: "tablet" | "mobile"): string {
  const def = buildDefinitionFromProjectParts(
    { title: "Site", theme: {} as never },
    [{ id: PAGE_ID, slug: "home", title: "Home", sort_order: 0 }],
    [{ id: SECTION_ID, page_id: PAGE_ID, section_type: type, sort_order: 0, props }],
  );
  const published = validateWebsiteDefinition(def);
  if (!published.ok) throw new Error(published.error);
  return renderToStaticMarkup(
    editDevice
      ? createElement(SiteRenderer, { definition: published.data, mode: "preview", pageSlug: "home", editor: { editDevice } })
      : createElement(SiteRenderer, { definition: published.data, mode: "live", pageSlug: "home" }),
  );
}

type Cta = { label: string; href: string };
type TemplateSection = { template: string; type: string; props: Record<string, unknown> };
const ALL_SECTIONS: TemplateSection[] = TEMPLATE_SEEDS.flatMap((t) =>
  t.definition.pages.flatMap((p) => p.sections.map((s) => ({ template: t.slug, type: s.type, props: s.props as Record<string, unknown> }))),
);
const WITH_SECONDARY = ALL_SECTIONS.filter((s) => "secondaryCta" in s.props);
const LEGACY_EDITORIAL = ALL_SECTIONS.filter((s) => s.type === "editorial-hero" && "backgroundImageUrl" in s.props);
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

beforeEach(() => {
  db.type = "editorial-hero";
  db.props = {};
});

describe("O6 audit — every secondaryCta shape in the repository", () => {
  it("37 sections in 37 templates: 36 editorial-hero + 1 hero, each { label: string, href: string }", () => {
    expect(WITH_SECONDARY).toHaveLength(37);
    expect(new Set(WITH_SECONDARY.map((s) => s.template)).size).toBe(37);
    expect(WITH_SECONDARY.filter((s) => s.type === "editorial-hero")).toHaveLength(36);
    expect(WITH_SECONDARY.filter((s) => s.type === "hero")).toHaveLength(1);
    for (const s of WITH_SECONDARY) {
      const cta = s.props.secondaryCta as Record<string, unknown>;
      expect(Object.keys(cta).sort(), s.template).toEqual(["href", "label"]);
      expect([typeof cta.label, typeof cta.href], s.template).toEqual(["string", "string"]);
      expect((cta.label as string).length, s.template).toBeGreaterThan(0);
    }
  });

  it("the legacy editorial-hero shape: 37 sections with backgroundImageUrl (all \"\"), overlay 0–0.75, textAlign left|center, eyebrow, primaryCta { label, href }", () => {
    expect(LEGACY_EDITORIAL).toHaveLength(37);
    for (const { template, props } of LEGACY_EDITORIAL) {
      expect(props.backgroundImageUrl, template).toBe("");
      expect(typeof props.overlay === "number" && props.overlay >= 0 && props.overlay <= 0.75, template).toBe(true);
      expect(["left", "center"], template).toContain(props.textAlign);
      expect(typeof props.eyebrow, template).toBe("string");
      if ("primaryCta" in props) expect(Object.keys(props.primaryCta as object).sort(), template).toEqual(["href", "label"]);
    }
  });
});

describe("O6 — template instantiation keeps both calls-to-action (and the rest of the legacy shape)", () => {
  it("every template still validates as a website (instantiation cannot break)", () => {
    for (const t of TEMPLATE_SEEDS) {
      const v = validateWebsiteDefinition(t.definition);
      expect(v.ok, `${t.slug}: ${v.ok ? "" : v.error}`).toBe(true);
    }
  });

  it("each of the 37 secondaryCta sections is stored with canonical primary + secondary buttons", () => {
    for (const { template, type, props } of WITH_SECONDARY) {
      const saved = (sectionPropsSchemas as Record<string, { parse: (v: unknown) => unknown }>)[type]!.parse(props) as Record<string, unknown>;
      const primary = props.primaryCta as Cta;
      const secondary = props.secondaryCta as Cta;
      expect({ label: saved.secondaryButtonLabel, href: saved.secondaryButtonHref }, template).toEqual(secondary);
      expect({ label: saved.buttonLabel, href: saved.buttonHref }, template).toEqual(primary);
      for (const legacyKey of ["primaryCta", "secondaryCta", "backgroundImageUrl", "overlay", "textAlign"]) expect(saved, `${template} ${legacyKey}`).not.toHaveProperty(legacyKey);
    }
  });

  it("each legacy editorial hero keeps its eyebrow, overlay and alignment", () => {
    for (const { template, props } of LEGACY_EDITORIAL) {
      const saved = sectionPropsSchemas["editorial-hero"].parse(props) as Record<string, unknown>;
      expect({ eyebrow: saved.eyebrow, overlayOpacity: saved.overlayOpacity, align: saved.align }, template).toEqual({ eyebrow: (props.eyebrow as string).trim(), overlayOpacity: props.overlay, align: props.textAlign });
    }
  });

  it("each of the 37 publishes both buttons with their links (and the editorial eyebrow)", () => {
    for (const { template, type, props } of WITH_SECONDARY) {
      const html = publishedHtml(type, props);
      for (const cta of [props.primaryCta as Cta, props.secondaryCta as Cta]) {
        expect(html, `${template}: ${cta.label}`).toContain(`href="${esc(cta.href)}"`);
        expect(html, `${template}: ${cta.label}`).toContain(esc(cta.label));
      }
      if (type === "editorial-hero" && (props.eyebrow as string).trim()) expect(html, template).toContain(esc((props.eyebrow as string).trim()));
    }
  });
});

describe("O6 — canonical values win; templates are never rewritten", () => {
  it("an edited second button wins over the template's; an emptied one stays empty (not re-filled from the template)", () => {
    const legacy = { secondaryCta: { label: "Template", href: "/t" } };
    expect(normalizeLegacyEditorialHeroProps({ ...legacy, secondaryButtonLabel: "Mine", secondaryButtonHref: "/mine" })).toMatchObject({ secondaryButtonLabel: "Mine", secondaryButtonHref: "/mine" });
    expect(normalizeLegacyHeroProps({ ...legacy, secondaryButtonLabel: "" })).toMatchObject({ secondaryButtonLabel: "" });
    const html = publishedHtml("editorial-hero", { heading: "H", ...legacy, secondaryButtonLabel: "" });
    expect(html).not.toContain("Template");
  });

  it("does not mutate its input (template definitions are never rewritten)", () => {
    for (const { props } of LEGACY_EDITORIAL) {
      const copy = JSON.parse(JSON.stringify(props));
      normalizeLegacyEditorialHeroProps(props);
      expect(props).toEqual(copy);
    }
  });

  it("sections without the legacy keys normalize to themselves — templates without a secondary CTA are unchanged", () => {
    const LEGACY_KEYS = ["backgroundImageUrl", "overlay", "textAlign", "primaryCta", "secondaryCta"];
    const plain = ALL_SECTIONS.filter((s) => (s.type === "editorial-hero" || s.type === "hero") && !LEGACY_KEYS.some((k) => k in s.props));
    expect(plain.length).toBeGreaterThan(0);
    for (const { template, type, props } of plain) {
      const out = type === "hero" ? normalizeLegacyHeroProps(props) : normalizeLegacyEditorialHeroProps(props);
      expect(out, template).toEqual(props);
    }
  });

  it("a Hero with one button renders exactly the previous single-button markup", () => {
    const html = publishedHtml("hero", { heading: "H", buttonLabel: "Go", buttonHref: "/go" });
    expect(html).toContain('class="mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-90"');
    expect(html).not.toContain("flex-wrap items-center gap-3");
  });
});

describe("O6 — second button survives edit, save, reload and publish; device behavior", () => {
  it("editing another field keeps the template's second button (stored legacy row → canonical on save)", async () => {
    db.props = { heading: "Legacy", subheading: "s", eyebrow: "Dakar", backgroundImageUrl: "", overlay: 0.3, textAlign: "center", primaryCta: { label: "Voir", href: "/voir" }, secondaryCta: { label: "WhatsApp", href: "https://wa.me/221770000000" } };
    const { status, props } = await patch({ heading: "Edited" });
    expect(status).toBe(200);
    expect(props).toMatchObject({ heading: "Edited", eyebrow: "Dakar", buttonLabel: "Voir", buttonHref: "/voir", secondaryButtonLabel: "WhatsApp", secondaryButtonHref: "https://wa.me/221770000000", overlayOpacity: 0.3, align: "center" });
    const html = publishedHtml("editorial-hero", props);
    expect(html).toContain('href="https://wa.me/221770000000"');
    expect(html).toContain("WhatsApp");
  });

  it("the second button's label and link are edited and stored (both hero types)", async () => {
    for (const type of ["hero", "editorial-hero"]) {
      db.type = type;
      db.props = { heading: "H" };
      const { status, props } = await patch({ secondaryButtonLabel: "Book a call", secondaryButtonHref: "/book" });
      expect(status, type).toBe(200);
      expect(props, type).toMatchObject({ secondaryButtonLabel: "Book a call", secondaryButtonHref: "/book" });
      const html = publishedHtml(type, props);
      expect(html, type).toContain('href="/book"');
      expect(html, type).toContain("Book a call");
    }
  });

  it("an unsafe second-button link is rejected like the first button's", async () => {
    db.props = { heading: "H" };
    const { status } = await patch({ secondaryButtonLabel: "x", secondaryButtonHref: "javascript:alert(1)" });
    expect(status).toBe(400);
  });

  it("a Phone-only second-button label renders only on Phone (device-editable like the first button)", () => {
    for (const type of ["hero", "editorial-hero"]) {
      const base = { heading: "H", buttonLabel: "Go", secondaryButtonLabel: "Desktop second", secondaryButtonHref: "/s" };
      const edited: Record<string, unknown> = { ...base, ...deviceScopedPatch(type, base, "mobile", { secondaryButtonLabel: "Phone second" }) };
      expect((edited.deviceOverrides as { mobile?: Record<string, unknown> }).mobile?.secondaryButtonLabel, type).toBe("Phone second");
      expect(edited.secondaryButtonLabel, type).toBe("Desktop second");
      expect(publishedHtml(type, edited, "mobile"), type).toContain("Phone second");
      expect(publishedHtml(type, edited), type).toContain("Desktop second");
    }
  });
});

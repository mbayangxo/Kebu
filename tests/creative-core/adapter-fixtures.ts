/**
 * S2 corpus — every 3B shape the legacy adapter must carry losslessly:
 *
 *   • all 126 template seeds as website-v1 definitions (includes the owner/portfolio sites and
 *     the T1 / O6 legacy Hero and editorial-hero shapes);
 *   • the same templates as stored rows, both schema-normalized (persistWebsiteDefinition) and
 *     raw (legacy props exactly as templates wrote them, extensions inside props as the Builder
 *     saves them), with 3B's chrome bootstrap;
 *   • the Gate 2 QA seed shape;
 *   • seeded adversarial mutations of all of the above (malformed overrides / extensions /
 *     layouts, non-dense and tied sort orders, odd themes, chrome variants).
 */
import { CHROME_FOOTER_ID, CHROME_HEADER_ID, defaultSiteChrome, extractSiteChromeFromSections, projectUsesEmbeddedNav } from "@/lib/create/site-chrome";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { sectionPropsSchemas, type WebsiteDefinition } from "@/lib/create/website-schema";
import type { ProjectRows, SectionRow } from "@/lib/create/kcd-adapter";
import { rng, uuidFor, type Rng } from "./helpers";

type SectionType = keyof typeof sectionPropsSchemas;

export const TEMPLATES = TEMPLATE_SEEDS.map((t) => ({ slug: t.slug, definition: t.definition as WebsiteDefinition }));

const EXT = { motion: "_motion", a11y: "_a11y", visibility: "_visibility", interaction: "_interaction", dataBinding: "_dataBinding" } as const;

/** Stored rows for a definition, as 3B would hold them after creation + chrome bootstrap. */
export function rowsFromDefinition(def: WebsiteDefinition, ns: number, mode: "normalized" | "raw"): ProjectRows {
  let n = 0;
  const id = () => uuidFor(++n, ns);
  const projectId = id();
  const pages = def.pages.map((p, i) => ({ id: id(), slug: p.slug, title: p.title, sort_order: i, device_layouts: null as unknown }));
  const sections: SectionRow[] = [];
  def.pages.forEach((page, pi) => {
    const legacyToRow = new Map<string, string>();
    page.sections.forEach((s, si) => {
      const rowId = id();
      if (s.id) legacyToRow.set(s.id, rowId);
      let props: Record<string, unknown> =
        mode === "normalized" ? (sectionPropsSchemas[s.type as SectionType].parse(s.props) as Record<string, unknown>) : { ...s.props };
      if (mode === "raw") {
        for (const [field, key] of Object.entries(EXT)) {
          const v = (s as Record<string, unknown>)[field];
          if (v !== undefined) props = { ...props, [key]: v };
        }
      }
      sections.push({ id: rowId, page_id: pages[pi].id, section_type: s.type, sort_order: si, props });
    });
    if (page.deviceLayouts) {
      const map = (ids?: string[]) => ids?.map((x) => legacyToRow.get(x) ?? x);
      pages[pi].device_layouts = Object.fromEntries(
        Object.entries(page.deviceLayouts).map(([device, l]) => [device, { ...l, sectionOrder: map(l?.sectionOrder), hiddenSections: map(l?.hiddenSections) }]),
      );
    }
  });

  // 3B chrome bootstrap (loadOrBootstrapSiteChrome): embedded-nav sites keep none.
  const types = sections.map((s) => s.section_type);
  let site_chrome: unknown = null;
  if (!projectUsesEmbeddedNav(types)) {
    const home = sections.filter((s) => s.page_id === pages[0]?.id);
    let boot = home.length ? extractSiteChromeFromSections(home, def.title) : defaultSiteChrome(def.title);
    if (!boot.header && !boot.footer) boot = defaultSiteChrome(def.title);
    site_chrome = boot;
  }
  return { project: { id: projectId, title: def.title, theme: def.theme, seo: def.seo ?? null, site_chrome }, pages, sections };
}

/** The Gate 2 QA seed: one home page, four sections inserted by the owner (props not normalized). */
export function gate2Rows(ns: number): ProjectRows {
  const specs = [
    { type: "hero", props: { subheading: "Gate 2 alpha" }, marker: "ALPHA hero" },
    { type: "text", props: { body: "Gate 2 bravo body." }, marker: "BRAVO text" },
    { type: "faq", props: { items: [{ question: "Gate 2?", answer: "Charlie." }] }, marker: "CHARLIE faq" },
    { type: "features", props: { items: [{ title: "Delta", body: "Gate 2 delta." }] }, marker: "DELTA features" },
  ];
  const projectId = uuidFor(1, ns);
  const pageId = uuidFor(2, ns);
  return {
    project: { id: projectId, title: "Gate2 qa-g2-abc", theme: {}, seo: null, site_chrome: null },
    pages: [{ id: pageId, slug: "home", title: "Home", sort_order: 0, device_layouts: null }],
    sections: specs.map((s, i) => ({
      id: uuidFor(10 + i, ns),
      page_id: pageId,
      section_type: s.type,
      sort_order: i,
      props: { heading: `p1-${s.marker}`, ...s.props },
    })),
  };
}

// ── Adversarial mutations ─────────────────────────────────────────────────────

const ODD_OVERRIDES: unknown[] = [
  {},
  null,
  { tablet: {} },
  { tablet: { heading: "Tablet" }, extraSlot: 1 },
  { tablet: "bad" },
  { mobile: [1, 2] },
  { _state: { mode: "weird" } },
  { _state: null, mobile: null },
  { mobile: { _motion: 1, align: "left" } },
  { tablet: { align: "center" }, mobile: { align: "left", heading: null }, _state: { mode: "custom", baseHash: "abc123" } },
];
const ODD_EXTENSIONS: [string, unknown][] = [
  ["_motion", null],
  ["_motion", { specs: [{ trigger: "scroll-enter", effect: "fade-in" }] }],
  ["_a11y", { landmark: "region" }],
  ["_a11y", { landmark: "main", label: "Main" }],
  ["_a11y", null],
  ["_interaction", { kind: "lightbox" }],
  ["_dataBinding", { source: "products" }],
  ["_visibility", { hideOn: ["mobile"] }],
];

/** Mutate rows in place with seeded odd-but-possible stored shapes. `withInvalidVisibility` adds shapes 3B renders but the model rejects. */
export function mutateRows(rows: ProjectRows, r: Rng, withInvalidVisibility = false): ProjectRows {
  for (const s of rows.sections) {
    const props = s.props as Record<string, unknown>;
    if (r.chance(0.25)) props.deviceOverrides = structuredClone(r.pick(ODD_OVERRIDES));
    if (r.chance(0.2)) {
      const [k, v] = r.pick(ODD_EXTENSIONS);
      props[k] = structuredClone(v);
    }
    if (withInvalidVisibility && r.chance(0.2)) props._visibility = r.pick([{ hideOn: ["desktop", "tablet", "mobile"] }, { showOn: ["mobile"], hideOn: ["mobile"] }]);
  }
  // Sort orders: gaps, ties, negatives — order is what 3B's stable sort gives.
  const style = r.int(4);
  const byPage = new Map<string, SectionRow[]>();
  for (const s of rows.sections) byPage.set(s.page_id, [...(byPage.get(s.page_id) ?? []), s]);
  for (const list of byPage.values()) {
    list.forEach((s, i) => {
      if (style === 1) s.sort_order = i * 10;
      if (style === 2) s.sort_order = Math.floor(i / 2);
      if (style === 3) s.sort_order = i - 3;
    });
  }
  if (r.chance(0.3)) {
    // A page with no stored sections (chrome still projects onto it).
    rows.pages.push({ id: uuidFor(0xe0000 + rows.pages.length, 0x9999), slug: "empty-page", title: "Empty", sort_order: rows.pages.length, device_layouts: null });
  }
  if (r.chance(0.3)) rows.pages.forEach((p, i) => (p.sort_order = (rows.pages.length - i) * 5));
  if (r.chance(0.3)) rows.pages.reverse(); // input order must not matter when sort_orders differ

  for (const page of rows.pages) {
    const ids = rows.sections.filter((s) => s.page_id === page.id).map((s) => s.id);
    if (!r.chance(0.6)) continue;
    const pickIds = () => ids.filter(() => r.chance(0.5));
    page.device_layouts = r.pick([
      {},
      { tablet: { sectionOrder: [...ids].reverse() } },
      { mobile: { sectionOrder: [...pickIds(), "stale-id", ids[0] ?? "x", "", 5, CHROME_FOOTER_ID], hiddenSections: [CHROME_HEADER_ID, ...pickIds()] } },
      { mobile: { sectionOrder: ids, hiddenSections: ids.slice(0, 1) } },
      { tablet: "bad", mobile: { hiddenSections: "nope" } },
      { desktop: { sectionOrder: ids }, tablet: { sectionOrder: [], extra: true } },
      { mobile: { sectionOrder: [` ${ids[0] ?? "x"}`, "y".repeat(90), ...ids] } },
    ]);
  }
  if (r.chance(0.2)) rows.project.theme = { ...(rows.project.theme as object), fonts: { display: "X" }, list: [1] };
  if (r.chance(0.1)) rows.project.theme = null;
  if (r.chance(0.2)) delete rows.project.seo;
  if (r.chance(0.2)) {
    rows.project.site_chrome = r.pick([
      null,
      { enabled: false, header: (rows.project.site_chrome as { header?: unknown } | null)?.header },
      { enabled: true },
      "garbage",
      { ...(rows.project.site_chrome as object), futureField: { x: 1 } },
    ]);
  }
  if (r.chance(0.1)) delete rows.project.site_chrome;
  return rows;
}

/** The whole rows corpus: templates (normalized + raw), Gate 2, and seeded mutations of each. */
export function rowsCorpus(): { name: string; rows: ProjectRows }[] {
  const out: { name: string; rows: ProjectRows }[] = [];
  TEMPLATES.forEach(({ slug, definition }, i) => {
    out.push({ name: `${slug} (normalized)`, rows: rowsFromDefinition(definition, 0x1000 + i, "normalized") });
    out.push({ name: `${slug} (raw)`, rows: rowsFromDefinition(definition, 0x2000 + i, "raw") });
    out.push({ name: `${slug} (mutated)`, rows: mutateRows(rowsFromDefinition(definition, 0x3000 + i, "raw"), rng(i + 1)) });
  });
  out.push({ name: "gate2", rows: gate2Rows(0x4000) });
  out.push({ name: "gate2 (mutated)", rows: mutateRows(gate2Rows(0x4001), rng(4001)) });
  out.push({ name: "empty project", rows: { project: { id: uuidFor(1, 0x4002), title: "Empty", theme: {}, seo: null, site_chrome: null }, pages: [], sections: [] } });
  return out;
}

/** website-v1 corpus: templates, plus seeded variants with odd legacy shapes and foreign keys. */
export function definitionCorpus(): { name: string; id: string; definition: Record<string, unknown> }[] {
  const out: { name: string; id: string; definition: Record<string, unknown> }[] = [];
  TEMPLATES.forEach(({ slug, definition }, i) => {
    out.push({ name: slug, id: `template:${slug}`, definition: definition as unknown as Record<string, unknown> });
    const r = rng(0x5000 + i);
    const def = structuredClone(definition) as unknown as Record<string, unknown>;
    const pages = def.pages as Record<string, unknown>[];
    const used = new Set(pages.flatMap((p) => (p.sections as { id?: string }[]).map((s) => s.id)).filter(Boolean));
    pages.forEach((page, pi) => {
      const sections = page.sections as Record<string, unknown>[];
      sections.forEach((s, si) => {
        if (r.chance(0.3)) {
          const next = r.pick([`section-${pi}-${si}`, uuidFor(pi * 100 + si + 1, 0x6000 + i), CHROME_HEADER_ID]);
          if (!used.has(next)) used.add((s.id = next));
        }
        if (r.chance(0.2)) delete s.id;
        if (r.chance(0.15)) s.motion = { specs: [] };
        if (r.chance(0.1)) s.a11y = { landmark: "region" }; // invalid in the model
        if (r.chance(0.1)) (s.props as Record<string, unknown>)._motion = { specs: [{ trigger: "load" }] };
        if (r.chance(0.1)) (s.props as Record<string, unknown>).deviceOverrides = r.pick(ODD_OVERRIDES);
        if (r.chance(0.05)) s.futureSectionKey = { v: 2 };
      });
      const ids = sections.map((s) => s.id).filter((x): x is string => typeof x === "string");
      if (r.chance(0.4)) page.deviceLayouts = { mobile: { sectionOrder: [...ids].reverse(), hiddenSections: ids.slice(0, 1) }, tablet: { sectionOrder: ["ghost", ...ids] } };
      if (r.chance(0.1)) page.futurePageKey = 1;
    });
    if (r.chance(0.2)) def.futureTopLevel = { flags: ["a"] };
    if (r.chance(0.2)) delete def.seo;
    out.push({ name: `${slug} (variant)`, id: `variant:${slug}`, definition: def });
  });
  return out;
}

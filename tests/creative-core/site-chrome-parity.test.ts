/**
 * S3 gate — ONE site-chrome semantic (docs/product/3C-S3-SITE-CHROME-CHARACTERIZATION.md).
 *
 * The canonical KCD composition (`composeKcdPage`) is compared, on every page × Desktop/Tablet/Phone:
 *   • with 3B's Editor  (buildEditorPreviewDefinition → composeSectionsForDevice): always equal;
 *   • with 3B's Publish (buildSnapshotFromDb's chrome step: applySiteChromeToDefinition on the stored
 *     chrome): equal, except in the reported conflict state, where they differ ONLY by the chrome;
 *   • KCD Editor / Preview / kcd-1 Published are one function, so they are equal by construction —
 *     asserted on the render view they all consume.
 * Corpus: every template as stored (owner sites included), raw + adversarial mutations (layouts
 * hiding chrome ids, empty pages, missing/disabled/garbage chrome), Gate 2, plus the conflict state
 * built on every embedded-navigation template.
 */
import { describe, expect, it } from "vitest";
import { DEVICES, canonicalStringify, type KcdDocument } from "@/lib/creative-core";
import { canonicalSiteChrome, composeKcdPage, kcdRenderDefinition, legacyOfNode, rowsToDocument, type ProjectRows } from "@/lib/create/kcd-adapter";
import { composeSectionsForDevice } from "@/lib/create/device-composition";
import { buildDefinitionFromProjectParts, buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { CHROME_FOOTER_ID, CHROME_HEADER_ID, applySiteChromeToDefinition, defaultSiteChrome, parseSiteChrome, projectUsesEmbeddedNav } from "@/lib/create/site-chrome";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { rowsCorpus, rowsFromDefinition, TEMPLATES } from "./adapter-fixtures";

type Device = (typeof DEVICES)[number];
type Parts = Parameters<typeof buildDefinitionFromProjectParts>;
const CHROME_IDS = new Set([CHROME_HEADER_ID, CHROME_FOOTER_ID]);

function threeBEditor(rows: ProjectRows): WebsiteDefinition {
  return buildEditorPreviewDefinition(rows.project as Parts[0], rows.pages as Parts[1], rows.sections as Parts[2], parseSiteChrome(rows.project.site_chrome));
}
/** buildSnapshotFromDb's composition step (stored chrome, no embedded-navigation check). */
function threeBPublish(rows: ProjectRows): WebsiteDefinition {
  return applySiteChromeToDefinition(buildDefinitionFromProjectParts(rows.project as Parts[0], rows.pages as Parts[1], rows.sections as Parts[2]), parseSiteChrome(rows.project.site_chrome));
}
const threeB = (def: WebsiteDefinition, i: number, d: Device) => composeSectionsForDevice(def.pages[i].sections, def.pages[i].deviceLayouts, d).map((s) => s.id!);
const kcd = (doc: KcdDocument, i: number, d: Device) => composeKcdPage(doc, doc.pages[i].id, d).map((n) => legacyOfNode(n).id ?? n.id);

/** Every embedded-navigation template with enabled stored chrome — the side-door conflict state. */
function conflictCases(): { name: string; rows: ProjectRows }[] {
  return TEMPLATES.map((t, i) => ({ t, i }))
    .filter(({ t }) => projectUsesEmbeddedNav(t.definition.pages.flatMap((p) => p.sections.map((s) => s.type))))
    .map(({ t, i }) => {
      const rows = rowsFromDefinition(t.definition, 0xc000 + i, "normalized");
      rows.project.site_chrome = defaultSiteChrome(t.definition.title);
      return { name: `${t.slug} + enabled chrome`, rows };
    });
}

const CORPUS = [...rowsCorpus(), ...conflictCases()].filter(({ rows }) => rows.pages.length > 0);

describe("canonical site chrome == 3B Editor, on every page and device", { timeout: 30_000 }, () => {
  it.each(CORPUS.map((c) => [c.name, c.rows] as const))("%s", (_name, rows) => {
    const { document } = rowsToDocument(rows);
    const editor = threeBEditor(rows);
    document.pages.forEach((_, i) => {
      for (const d of DEVICES) expect(kcd(document, i, d), `page ${i} ${d}`).toEqual(threeB(editor, i, d));
    });
  });
});

describe("canonical site chrome == 3B Publish, except the reported conflict (chrome only)", { timeout: 30_000 }, () => {
  it.each(CORPUS.map((c) => [c.name, c.rows] as const))("%s", (_name, rows) => {
    const { document, issues } = rowsToDocument(rows);
    const conflict = canonicalSiteChrome(document).conflict;
    expect(issues.some((i) => i.field === "site_chrome")).toBe(conflict);
    const publish = threeBPublish(rows);
    document.pages.forEach((_, i) => {
      for (const d of DEVICES) {
        const ours = kcd(document, i, d);
        const theirs = threeB(publish, i, d);
        if (!conflict) expect(ours, `page ${i} ${d}`).toEqual(theirs);
        else {
          // 3B publish adds the universal chrome and strips stored navigation/footer; nothing else differs.
          const body = (ids: string[], strip: boolean) =>
            ids.filter((id) => !CHROME_IDS.has(id) && !(strip && ["navigation", "footer"].includes(rows.sections.find((s) => s.id === id)?.section_type ?? "")));
          expect(body(ours, true), `page ${i} ${d}`).toEqual(body(theirs, false));
        }
      }
    });
  });

  it("the conflict corpus covers every embedded-navigation owner site", () => {
    const names = conflictCases().map((c) => c.name);
    expect(names.some((n) => n.startsWith("musician-maylecor-ksendr"))).toBe(true);
    expect(names.some((n) => n.startsWith("agency-kdirection"))).toBe(true);
    expect(names).toHaveLength(4);
  });
});

describe("Editor, Preview and kcd-1 consume one semantic representation", { timeout: 30_000 }, () => {
  it.each(CORPUS.filter((_, i) => i % 5 === 0).map((c) => [c.name, c.rows] as const))("%s", (_name, rows) => {
    const { document } = rowsToDocument(rows);
    // The one render view: its sections per page are exactly the canonical base composition.
    const view = kcdRenderDefinition(document);
    view.pages.forEach((page, i) => {
      const expected = composeKcdPage(document, document.pages[i].id, "desktop").map((n) => n.id as string);
      const shown = composeSectionsForDevice(page.sections, page.deviceLayouts, "desktop").map((s) => s.id!);
      expect(shown).toEqual(expected);
    });
    // Deterministic: the same document always yields the same view.
    expect(canonicalStringify(kcdRenderDefinition(document))).toBe(canonicalStringify(view));
  });
});

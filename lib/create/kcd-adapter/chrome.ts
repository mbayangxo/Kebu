/**
 * Site chrome (universal header/footer) — ONE canonical semantic for Editor, Preview and kcd-1
 * Published/Live (docs/product/3C-S3-SITE-CHROME-CHARACTERIZATION.md).
 *
 *   SOURCE OF TRUTH   projects.site_chrome → document.meta.siteChrome, stored verbatim. The only copy.
 *   APPLIES           parsed enabled ∧ (header ∨ footer) ∧ no flagship section embedding its own
 *                     navigation (projectUsesEmbeddedNav) — the Builder editor's rule.
 *   PAGE PROJECTION   a pure function of (source, page), computed at render time: header first and
 *                     footer last on every page, with the synthetic ids `kebu-chrome-header` /
 *                     `kebu-chrome-footer` (so page layouts may hide them, as in 3B). Never stored in
 *                     the document, never a node operations can address — it cannot diverge.
 *   SUPPRESSION       while chrome applies, stored navigation/footer sections are kept but not
 *                     rendered (3B stripChromeSections).
 *   CONFLICT          stored chrome enabled on a site whose flagship section embeds navigation: 3B's
 *                     editor shows no chrome but 3B's publish injects it. Reported explicitly;
 *                     the canonical rule renders no chrome; kcd-1 publish must block it (S7).
 */
import {
  isVisible,
  legacySectionType,
  legacySectionTypeOf,
  orderRootsForDevice,
  roots,
  type Device,
  type KcdDocument,
  type KcdNode,
  type NodeId,
  type PageId,
  type RootOrderOptions,
} from "@/lib/creative-core";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  parseSiteChrome,
  projectUsesEmbeddedNav,
  type SiteChrome,
} from "@/lib/create/site-chrome";
import { legacyOfNode } from "./legacy";
import { liftStoredProps } from "./stored-props";

export const CHROME_PARTS = [
  { part: "header", id: CHROME_HEADER_ID, sectionType: "navigation" },
  { part: "footer", id: CHROME_FOOTER_ID, sectionType: "footer" },
] as const;

export interface CanonicalChrome {
  /** The chrome every page renders, or null. */
  chrome: SiteChrome | null;
  /** Stored chrome is enabled but a flagship section embeds navigation (see file comment). */
  conflict: boolean;
}

function sectionTypes(doc: KcdDocument): string[] {
  const out: string[] = [];
  for (const node of Object.values(doc.nodes)) {
    const t = legacySectionTypeOf(node.type);
    if (t) out.push(t);
  }
  return out;
}

/** Whether chrome applies to a site with these stored values (shared by the adapter and the document rule). */
export function chromeFor(storedChrome: unknown, types: readonly string[]): CanonicalChrome {
  const chrome = parseSiteChrome(storedChrome);
  if (!chrome.enabled || (!chrome.header && !chrome.footer)) return { chrome: null, conflict: false };
  if (projectUsesEmbeddedNav([...types])) return { chrome: null, conflict: true };
  return { chrome, conflict: false };
}

export function canonicalSiteChrome(doc: KcdDocument): CanonicalChrome {
  if (!("siteChrome" in doc.meta)) return { chrome: null, conflict: false };
  return chromeFor(doc.meta.siteChrome, sectionTypes(doc));
}

/** Stored navigation/footer roots not rendered because the site chrome replaces them. */
export function chromeSuppressedIds(doc: KcdDocument, canonical = canonicalSiteChrome(doc)): ReadonlySet<NodeId> {
  const out = new Set<NodeId>();
  if (!canonical.chrome) return out;
  for (const node of Object.values(doc.nodes)) {
    if (node.parentId !== null) continue;
    const t = legacySectionTypeOf(node.type);
    if (t === "navigation" || t === "footer") out.add(node.id);
  }
  return out;
}

/** A projected chrome node: render-only, never part of `doc.nodes`. */
export function isChromeProjection(node: Pick<KcdNode, "id">): boolean {
  return node.id === CHROME_HEADER_ID || node.id === CHROME_FOOTER_ID;
}

function projection(part: (typeof CHROME_PARTS)[number], props: Record<string, unknown>, pageId: PageId): KcdNode {
  return {
    id: part.id as NodeId,
    type: legacySectionType(part.sectionType),
    typeVersion: 1,
    pageId,
    parentId: null,
    orderKey: "",
    ...liftStoredProps(props).fields,
    version: 1,
  };
}

/**
 * A page's rendered roots in base (Desktop) order: projected header, the stored roots that are not
 * suppressed, projected footer. Projected props are the parsed stored chrome props — exactly what
 * 3B injects (composePageSectionsWithChrome).
 */
export function pageRenderRoots(doc: KcdDocument, pageId: PageId, canonical = canonicalSiteChrome(doc)): KcdNode[] {
  const suppressed = chromeSuppressedIds(doc, canonical);
  const body = roots(doc, pageId).filter((n) => !suppressed.has(n.id));
  const chrome = canonical.chrome;
  if (!chrome) return body;
  const out: KcdNode[] = [];
  if (chrome.header) out.push(projection(CHROME_PARTS[0], chrome.header.props as Record<string, unknown>, pageId));
  out.push(...body);
  if (chrome.footer) out.push(projection(CHROME_PARTS[1], chrome.footer.props as Record<string, unknown>, pageId));
  return out;
}

/**
 * Chrome pinned first/last on every device: the projection, and — in website-v1 snapshots, where
 * chrome was baked in as ordinary sections — sections that carry the synthetic ids.
 */
export function chromeRootOptions(nodes: readonly KcdNode[]): RootOrderOptions {
  const pinnedFirst = new Set<string>();
  const pinnedLast = new Set<string>();
  for (const node of nodes) {
    const id = legacyOfNode(node).id ?? node.id;
    if (id === CHROME_HEADER_ID) pinnedFirst.add(node.id);
    if (id === CHROME_FOOTER_ID) pinnedLast.add(node.id);
  }
  return { pinnedFirst, pinnedLast };
}

/** Ordered, visible roots of a page on `device` — the canonical page composition. */
export function composeKcdPage(doc: KcdDocument, pageId: PageId, device: Device): KcdNode[] {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Unknown page ${pageId}`);
  const base = pageRenderRoots(doc, pageId);
  return orderRootsForDevice(base, page, device, chromeRootOptions(base)).filter((n) => isVisible(n, page, device));
}

/**
 * Canonical web projection shared by the Builder and Preview.
 * Legacy nodes retain their exact 3B stored props and chrome semantics. The native pilot
 * projects only that legacy portion into a render-only website-v1 view and supplies the
 * canonical KCD document separately to SiteRenderer; native trees never become v1 sections.
 * The default v1 projection/manifest remain legacy-only until QA/release gates approve native publishing by default.
 */
import { PILOT_DEFINITIONS, type KcdDocument, type KcdNode, type RendererManifest } from "@/lib/creative-core";
import { resolveEditorTheme } from "@/lib/create/editor-definition";
import { CHROME_HEADER_ID } from "@/lib/create/site-chrome";
import { mergeSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { canonicalSiteChrome, isChromeProjection, pageRenderRoots } from "./chrome";
import { AdapterError } from "./errors";
import { repackLayouts, writeTheme } from "./legacy";
import { LEGACY_DEFINITIONS } from "./legacy-registry";
import { writeV1Section } from "./sections";

type RenderPage = WebsiteDefinition["pages"][number];
type RenderSection = RenderPage["sections"][number];

const LEGACY_TYPES: ReadonlySet<string> = new Set(LEGACY_DEFINITIONS.map((d) => d.type));
/** Capabilities 3B's web rendering realizes. `interaction` / `dataBinding` are stored but not rendered (F0-C). */
const WEB_DOM_CAPABILITIES: ReadonlySet<string> = new Set(["layout.flow", "responsive.overrides", "text.edit", "media", "a11y", "links", "motion"]);

/** What the web renderer realizes in S3: legacy section types (native primitives arrive in S6). */
export const WEB_DOM_MANIFEST: RendererManifest = {
  renderer: "web-dom",
  version: 1,
  supportsNodeType: (type, typeVersion) => LEGACY_TYPES.has(type) && typeVersion === 1,
  supports: (type, capability) => LEGACY_TYPES.has(type) && WEB_DOM_CAPABILITIES.has(capability),
};

export function kcdRenderDefinition(doc: KcdDocument): WebsiteDefinition {
  return renderDefinition(doc, (node) => ({ id: node.id, ...writeV1Section(node) }) as unknown as RenderSection);
}

/** Legacy portion of a mixed KCD page. Native trees stay in KCD, never in website-v1 sections. */
export function kcdLegacyRenderDefinition(doc: KcdDocument): WebsiteDefinition {
  return renderDefinition(doc, (node) => ({ id: node.id, ...writeV1Section(node) }) as unknown as RenderSection, true);
}

export const PILOT_WEB_DOM_MANIFEST: RendererManifest = {
  renderer: "web-dom", version: 11,
  supportsNodeType: (type, version) => WEB_DOM_MANIFEST.supportsNodeType(type, version) || PILOT_DEFINITIONS.some((definition) => definition.type === type && definition.version === version),
  supports: (type, capability) => WEB_DOM_MANIFEST.supports(type, capability) || (PILOT_DEFINITIONS.find((definition) => definition.type === type)?.capabilities.has(capability) ?? false),
};

/** An editor owns immutable nodes; unchanged content must not be reserialized on every edit. */
export function createKcdRenderProjection(allowNative = false): (document: KcdDocument) => WebsiteDefinition {
  const sections = new WeakMap<KcdNode, RenderSection>();
  return (document) => renderDefinition(document, (node) => {
    let section = sections.get(node);
    if (!section) {
      section = { id: node.id, ...writeV1Section(node) } as unknown as RenderSection;
      sections.set(node, section);
    }
    return section;
  }, allowNative);
}

function renderDefinition(doc: KcdDocument, projectSection: (node: KcdNode) => RenderSection, allowNative = false): WebsiteDefinition {
  for (const node of Object.values(doc.nodes)) {
    if (allowNative && PILOT_DEFINITIONS.some((definition) => definition.type === node.type && definition.version === node.typeVersion)) continue;
    if (!LEGACY_TYPES.has(node.type) || node.parentId !== null) {
      throw new AdapterError("unsupported-node", `"${node.type}" elements cannot be displayed by the web renderer yet`);
    }
  }
  const canonical = canonicalSiteChrome(doc);
  const theme = writeTheme(doc);
  return {
    schemaVersion: "website-v1",
    title: doc.title,
    theme: resolveEditorTheme(theme.present ? theme.value : undefined),
    seo: mergeSiteSeo(doc.meta.seo as SiteSeo | Record<string, unknown> | null | undefined, doc.title),
    pages: doc.pages.map((page): RenderPage => {
      const sections = pageRenderRoots(doc, page.id, canonical).filter((node) => LEGACY_TYPES.has(node.type)).map((node) => {
        if (isChromeProjection(node)) {
          // 3B injects the parsed stored chrome props as they are (composePageSectionsWithChrome).
          const part = canonical.chrome![node.id === CHROME_HEADER_ID ? "header" : "footer"]!;
          return { id: node.id, type: part.type, props: part.props } as RenderSection;
        }
        return projectSection(node);
      });
      const deviceLayouts = repackLayouts(page.deviceLayout, (id) => id, "v1") as RenderPage["deviceLayouts"];
      return { slug: page.slug, title: page.title, sections, ...(deviceLayouts ? { deviceLayouts } : {}) };
    }),
  };
}

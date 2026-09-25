import type { WebsiteDefinition } from "./website-schema";
import type { SiteSeo } from "./site-seo";
import { mergeSiteSeo } from "./site-seo";
import {
  applySiteChromeToDefinition,
  projectUsesEmbeddedNav,
  stripChromeSections,
  type SiteChrome,
} from "./site-chrome";

type ApiPage = { id: string; slug: string; title: string; sort_order: number; device_layouts?: unknown };
type ApiSection = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Record<string, unknown>;
};

// Reserved underscore-prefixed keys stored inside section props for extension data.
// These are lifted out of props and placed on the section object when building WebsiteDefinition.
const SECTION_EXT_KEYS = ["_motion", "_a11y", "_visibility", "_interaction", "_dataBinding"] as const;
type SectionExtKey = (typeof SECTION_EXT_KEYS)[number];
const EXT_KEY_MAP: Record<SectionExtKey, string> = {
  _motion: "motion",
  _a11y: "a11y",
  _visibility: "visibility",
  _interaction: "interaction",
  _dataBinding: "dataBinding",
};

function extractSectionExtensions(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SECTION_EXT_KEYS) {
    if (k in props && props[k] != null) {
      out[EXT_KEY_MAP[k]] = props[k];
    }
  }
  return out;
}

export function buildDefinitionFromProjectParts(
  project: { title: string; theme?: WebsiteDefinition["theme"]; seo?: SiteSeo | Record<string, unknown> | null },
  pages: ApiPage[],
  sections: ApiSection[],
): WebsiteDefinition {
  const sortedPages = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  return {
    schemaVersion: "website-v1",
    title: project.title,
    theme: project.theme ?? {
      primary: "#0F0D33",
      accent: "#00C851",
      background: "#FAFAF8",
      text: "#0F0D33",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
    },
    seo: mergeSiteSeo(project.seo, project.title),
    pages: sortedPages.length
      ? sortedPages.map((page) => ({
          slug: page.slug,
          title: page.title,
          deviceLayouts: page.device_layouts ?? undefined,
          sections: sections
            .filter((s) => s.page_id === page.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => ({
              id: s.id,
              type: s.section_type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
              props: s.props,
              ...extractSectionExtensions(s.props),
            })),
        }))
      : [
          {
            slug: "home",
            title: "Home",
            sections: [],
          },
        ],
  };
}

/** Editor/publish preview — inject universal header/footer when enabled. */
export function buildEditorPreviewDefinition(
  project: { title: string; theme?: WebsiteDefinition["theme"]; seo?: SiteSeo | Record<string, unknown> | null },
  pages: ApiPage[],
  sections: ApiSection[],
  chrome: SiteChrome | null | undefined,
): WebsiteDefinition {
  const sectionTypes = sections.map((s) => s.section_type);
  const useChrome = Boolean(chrome?.enabled && !projectUsesEmbeddedNav(sectionTypes));
  const bodySections = useChrome ? stripChromeSections(sections) : sections;
  const base = buildDefinitionFromProjectParts(project, pages, bodySections);
  if (useChrome && chrome) {
    return applySiteChromeToDefinition(base, chrome);
  }
  return base;
}

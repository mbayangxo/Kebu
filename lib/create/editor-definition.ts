import type { WebsiteDefinition } from "./website-schema";
import type { SiteSeo } from "./site-seo";
import { mergeSiteSeo } from "./site-seo";

type ApiPage = { id: string; slug: string; title: string; sort_order: number };
type ApiSection = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Record<string, unknown>;
};

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
    },
    seo: mergeSiteSeo(project.seo, project.title),
    pages: sortedPages.length
      ? sortedPages.map((page) => ({
          slug: page.slug,
          title: page.title,
          sections: sections
            .filter((s) => s.page_id === page.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => ({
              id: s.id,
              type: s.section_type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
              props: s.props,
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

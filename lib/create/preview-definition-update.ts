import type { WebsiteDefinition } from "@/lib/create/website-schema";

type Section = WebsiteDefinition["pages"][number]["sections"][number];
type Page = WebsiteDefinition["pages"][number];
export type PreviewDefinitionUpdate =
  | { kind: "full"; sequence: number; definition: WebsiteDefinition }
  | { kind: "delta"; sequence: number; base: number; metadata: Omit<WebsiteDefinition, "pages">;
      pages: Array<{ metadata: Omit<Page, "sections">; sectionIds: string[] }>; sections: Section[] };

function sectionsById(definition: WebsiteDefinition): Map<string, Section> | null {
  const sections = new Map<string, Section>();
  for (const page of definition.pages) for (const section of page.sections) {
    if (!section.id || sections.has(section.id)) return null;
    sections.set(section.id, section);
  }
  return sections;
}

/** Immutable KCD projections retain section identities; only changed content crosses the iframe boundary. */
export function previewDefinitionUpdate(previous: WebsiteDefinition | null, definition: WebsiteDefinition,
  sequence: number, base: number): PreviewDefinitionUpdate {
  const before = previous && sectionsById(previous), after = sectionsById(definition);
  // Older legacy definitions without stable section ids retain the full-update path.
  if (!before || !after) return { kind: "full", sequence, definition };
  const { pages, ...metadata } = definition;
  return { kind: "delta", sequence, base, metadata,
    pages: pages.map(({ sections, ...metadata }) => ({ metadata, sectionIds: sections.map((section) => section.id!) })),
    sections: [...after.values()].filter((section) => before.get(section.id!) !== section),
  };
}

/** Reject stale/missing updates rather than showing a partial definition; the receiver requests a full refresh. */
export function applyPreviewDefinitionUpdate(previous: WebsiteDefinition | null, sequence: number,
  update: PreviewDefinitionUpdate): WebsiteDefinition | null {
  if (update.kind === "full") return update.definition;
  if (!previous || update.base !== sequence || update.sequence !== sequence + 1) return null;
  const sections = sectionsById(previous);
  if (!sections) return null;
  for (const section of update.sections) {
    if (!section.id) return null;
    sections.set(section.id, section);
  }
  const seen = new Set<string>();
  const pages: Page[] = [];
  for (const page of update.pages) {
    const resolved: Section[] = [];
    for (const id of page.sectionIds) {
      const section = sections.get(id);
      if (!section || seen.has(id)) return null;
      seen.add(id); resolved.push(section);
    }
    pages.push({ ...page.metadata, sections: resolved });
  }
  return { ...update.metadata, pages };
}

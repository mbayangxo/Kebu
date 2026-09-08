import { z } from "zod";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

/** Synthetic section ids injected at render/publish time — not stored in project_sections. */
export const CHROME_HEADER_ID = "kebu-chrome-header";
export const CHROME_FOOTER_ID = "kebu-chrome-footer";

export const CHROME_SECTION_TYPES = ["navigation", "footer"] as const;

export const siteChromeSchema = z.object({
  enabled: z.boolean().default(true),
  header: z
    .object({
      type: z.literal("navigation"),
      props: sectionPropsSchemas.navigation,
    })
    .optional(),
  footer: z
    .object({
      type: z.literal("footer"),
      props: sectionPropsSchemas.footer,
    })
    .optional(),
});

export type SiteChrome = z.infer<typeof siteChromeSchema>;

export function isChromeSectionId(id: string): boolean {
  return id === CHROME_HEADER_ID || id === CHROME_FOOTER_ID;
}

export function parseSiteChrome(raw: unknown): SiteChrome {
  const parsed = siteChromeSchema.safeParse(raw);
  if (!parsed.success) return { enabled: false };
  if (!parsed.data.header && !parsed.data.footer) {
    return { enabled: false };
  }
  return parsed.data;
}

export function defaultSiteChrome(siteTitle = "My site"): SiteChrome {
  const nav = defaultSectionProps("navigation") as z.infer<typeof sectionPropsSchemas.navigation>;
  nav.brand = siteTitle;
  return siteChromeSchema.parse({
    enabled: true,
    header: { type: "navigation", props: nav },
    footer: { type: "footer", props: defaultSectionProps("footer") },
  });
}

type RawSection = {
  id?: string;
  section_type?: string;
  type?: string;
  props?: unknown;
};

export function extractSiteChromeFromSections(
  sections: RawSection[],
  siteTitle = "My site",
): SiteChrome {
  const nav = sections.find((s) => (s.section_type ?? s.type) === "navigation");
  const foot = sections.find((s) => (s.section_type ?? s.type) === "footer");
  if (!nav && !foot) return { enabled: false };
  return siteChromeSchema.parse({
    enabled: true,
    header: nav
      ? {
          type: "navigation",
          props: sectionPropsSchemas.navigation.parse(
            nav.props ?? defaultSectionProps("navigation"),
          ),
        }
      : undefined,
    footer: foot
      ? {
          type: "footer",
          props: sectionPropsSchemas.footer.parse(foot.props ?? defaultSectionProps("footer")),
        }
      : undefined,
  });
}

/** Flagship layouts embed their own nav — skip universal chrome. */
export function projectUsesEmbeddedNav(sectionTypes: string[]): boolean {
  return sectionTypes.some((t) =>
    ["maylecor-home", "legally-blonde-hero", "kdirection-home", "kdirection-page"].includes(t),
  );
}

export function stripChromeSections<T extends { section_type?: string; type?: string }>(
  sections: T[],
): T[] {
  return sections.filter((s) => {
    const type = s.section_type ?? s.type;
    return type !== "navigation" && type !== "footer";
  });
}

type ComposedSection = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  page_id?: string;
  section_type?: string;
  sort_order?: number;
};

export function composePageSectionsWithChrome(
  bodySections: ComposedSection[],
  chrome: SiteChrome | null | undefined,
): ComposedSection[] {
  if (!chrome?.enabled) return bodySections;

  const body = stripChromeSections(bodySections);
  const out: ComposedSection[] = [];

  if (chrome.header) {
    out.push({
      id: CHROME_HEADER_ID,
      type: "navigation",
      section_type: "navigation",
      props: chrome.header.props as Record<string, unknown>,
      sort_order: -2,
    });
  }

  body.forEach((s, i) => {
    out.push({ ...s, sort_order: i });
  });

  if (chrome.footer) {
    out.push({
      id: CHROME_FOOTER_ID,
      type: "footer",
      section_type: "footer",
      props: chrome.footer.props as Record<string, unknown>,
      sort_order: body.length + 1,
    });
  }

  return out;
}

export function applySiteChromeToDefinition(
  def: WebsiteDefinition,
  chrome: SiteChrome | null | undefined,
): WebsiteDefinition {
  if (!chrome?.enabled) return def;
  return {
    ...def,
    pages: def.pages.map((page) => ({
      ...page,
      sections: composePageSectionsWithChrome(
        page.sections.map((s) => ({
          id: s.id,
          type: s.type,
          props: s.props as Record<string, unknown>,
        })),
        chrome,
      ).map((s) => ({
        id: s.id,
        type: s.type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
        props: s.props,
      })),
    })),
  };
}

export function patchSiteChromePart(
  chrome: SiteChrome,
  part: "header" | "footer",
  props: Record<string, unknown>,
): SiteChrome {
  if (part === "header") {
    const merged = {
      ...(chrome.header?.props ?? defaultSectionProps("navigation")),
      ...props,
    };
    const parsed = sectionPropsSchemas.navigation.parse(merged);
    return {
      ...chrome,
      enabled: true,
      header: { type: "navigation", props: parsed },
    };
  }
  const merged = {
    ...(chrome.footer?.props ?? defaultSectionProps("footer")),
    ...props,
  };
  const parsed = sectionPropsSchemas.footer.parse(merged);
  return {
    ...chrome,
    enabled: true,
    footer: { type: "footer", props: parsed },
  };
}

export async function loadOrBootstrapSiteChrome(
  supabase: { from: (t: string) => unknown },
  projectId: string,
  homeSections: RawSection[],
  siteTitle: string,
  sectionTypesAll: string[],
): Promise<SiteChrome> {
  const db = supabase as {
    from: (t: string) => {
      select: (c: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: { site_chrome?: unknown; title?: string } | null }> } };
      update: (p: object) => { eq: (a: string, b: string) => Promise<unknown> };
    };
  };

  const { data: project } = await db
    .from("projects")
    .select("site_chrome, title")
    .eq("id", projectId)
    .maybeSingle();

  const existing = parseSiteChrome(project?.site_chrome);
  if (existing.enabled && (existing.header || existing.footer)) {
    return existing;
  }

  if (projectUsesEmbeddedNav(sectionTypesAll)) {
    return { enabled: false };
  }

  const boot =
    homeSections.length > 0
      ? extractSiteChromeFromSections(homeSections, siteTitle || project?.title || "My site")
      : defaultSiteChrome(siteTitle || project?.title || "My site");

  if (!boot.header && !boot.footer) {
    return defaultSiteChrome(siteTitle || project?.title || "My site");
  }

  try {
    await db
      .from("projects")
      .update({ site_chrome: boot, updated_at: new Date().toISOString() })
      .eq("id", projectId);
  } catch {
    /* column may be missing until migration 065 */
  }

  return boot;
}

/** Keep site chrome header links aligned with project pages (add/rename/delete pages). */
export function navLinksFromPages(
  pages: { slug: string; title: string; sort_order?: number }[],
): { label: string; href: string }[] {
  return [...pages]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .filter((p) => p.slug !== "home")
    .slice(0, 8)
    .map((p) => ({
      label: (p.title.slice(0, 40) || p.slug),
      href: `/${p.slug}`,
    }));
}

export function withSyncedChromeNavLinks(
  chrome: SiteChrome,
  pages: { slug: string; title: string; sort_order?: number }[],
  brand?: string,
): SiteChrome {
  if (!chrome.enabled || !chrome.header) return chrome;
  const links = navLinksFromPages(pages);
  const baseProps = chrome.header.props;
  const props = sectionPropsSchemas.navigation.parse({
    ...baseProps,
    brand: brand?.trim() || baseProps.brand,
    links,
  });
  return {
    ...chrome,
    enabled: true,
    header: { type: "navigation", props },
  };
}

type ChromeSyncClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { site_chrome?: unknown; title?: string } | null }>;
        order: (column: string) => Promise<{ data: { slug: string; title: string; sort_order: number }[] | null }>;
      };
    };
    update: (values: object) => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };
};

/** Persist chrome nav links from current project_pages (no-op if chrome disabled). */
export async function syncProjectChromeNavFromPages(
  supabase: ChromeSyncClient,
  projectId: string,
): Promise<void> {
  const { data: project } = await supabase
    .from("projects")
    .select("site_chrome, title")
    .eq("id", projectId)
    .maybeSingle();

  const chrome = parseSiteChrome(project?.site_chrome);
  if (!chrome.enabled || !chrome.header) return;

  const { data: pages } = await supabase
    .from("project_pages")
    .select("slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  if (!pages?.length) return;

  const next = withSyncedChromeNavLinks(chrome, pages, project?.title);
  await supabase
    .from("projects")
    .update({ site_chrome: next, updated_at: new Date().toISOString() })
    .eq("id", projectId);
}


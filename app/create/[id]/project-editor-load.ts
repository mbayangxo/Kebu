import type { WebsiteDefinition } from "@/lib/create/website-schema";
import type { SiteSeo } from "@/lib/create/site-seo";

export type EditorSection = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Record<string, unknown>;
};

export type EditorProject = {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  subdomain?: string | null;
  theme?: WebsiteDefinition["theme"];
  business_id?: string | null;
  seo?: SiteSeo | Record<string, unknown> | null;
};

export type PortfolioUpgrade = "maylecor" | "kdirection" | null;

/**
 * Determines whether a legacy portfolio draft needs its one-time structural
 * upgrade. Keep this pure so loading the editor does not bury template routing
 * rules among React state updates.
 */
export function portfolioUpgradeForProject(payload: unknown): PortfolioUpgrade {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    project?: { description?: unknown };
    sections?: Array<{ section_type?: unknown }>;
  };
  const description =
    typeof data.project?.description === "string" ? data.project.description : "";
  const sectionTypes = Array.isArray(data.sections)
    ? data.sections.map((section) => section.section_type)
    : [];

  if (
    description.includes("portfolio:maylecor") ||
    sectionTypes.some(
      (type) => type === "legally-blonde-hero" || type === "maylecor-home",
    )
  ) {
    return "maylecor";
  }

  if (
    description.includes("portfolio:kdirection") ||
    sectionTypes.some(
      (type) => type === "kdirection-home" || type === "kdirection-page",
    )
  ) {
    return "kdirection";
  }

  return null;
}

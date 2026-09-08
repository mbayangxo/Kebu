import type { WebsiteDefinition } from "./website-schema";

/** One section-level AI diff row for preview accept/reject (B6). */
export type AiSectionChange = {
  sectionId: string;
  pageSlug: string;
  pageTitle: string;
  sectionType: string;
  summary: string;
  /** true = new section not in current draft */
  isNew: boolean;
};

function sectionSummary(type: string, props: Record<string, unknown>): string {
  const heading =
    props.heading ?? props.title ?? props.brand ?? props.headline ?? props.subheading ?? "";
  const text = typeof heading === "string" ? heading.trim().slice(0, 48) : "";
  return text ? `${type.replace(/-/g, " ")} — “${text}”` : type.replace(/-/g, " ");
}

/** Deterministic section-level diff for preview checkboxes. */
export function buildAiSectionChanges(
  before: WebsiteDefinition,
  after: WebsiteDefinition,
): AiSectionChange[] {
  const changes: AiSectionChange[] = [];
  const beforeIds = new Set<string>();

  for (const page of before.pages) {
    for (const section of page.sections) {
      beforeIds.add(section.id);
    }
  }

  for (const afterPage of after.pages) {
    const beforePage = before.pages.find((p) => p.slug === afterPage.slug);

    for (const afterSection of afterPage.sections) {
      const beforeSection = beforePage?.sections.find((s) => s.id === afterSection.id);
      const isNew = !beforeIds.has(afterSection.id);

      if (!beforeSection) {
        changes.push({
          sectionId: afterSection.id,
          pageSlug: afterPage.slug,
          pageTitle: afterPage.title,
          sectionType: afterSection.type,
          summary: sectionSummary(afterSection.type, afterSection.props as Record<string, unknown>),
          isNew: true,
        });
        continue;
      }

      if (beforeSection.type !== afterSection.type) {
        changes.push({
          sectionId: afterSection.id,
          pageSlug: afterPage.slug,
          pageTitle: afterPage.title,
          sectionType: afterSection.type,
          summary: `Change ${beforeSection.type} → ${afterSection.type}`,
          isNew: false,
        });
        continue;
      }

      const bJson = JSON.stringify(beforeSection.props);
      const aJson = JSON.stringify(afterSection.props);
      if (bJson !== aJson) {
        changes.push({
          sectionId: afterSection.id,
          pageSlug: afterPage.slug,
          pageTitle: afterPage.title,
          sectionType: afterSection.type,
          summary: sectionSummary(afterSection.type, afterSection.props as Record<string, unknown>),
          isNew: false,
        });
      }
    }
  }

  return changes.slice(0, 24);
}

/** Apply only accepted section patches onto the current draft. */
export function mergePartialAiDefinition(
  current: WebsiteDefinition,
  proposed: WebsiteDefinition,
  acceptedSectionIds: string[],
): WebsiteDefinition {
  const accepted = new Set(acceptedSectionIds);
  const result: WebsiteDefinition = structuredClone(current);

  for (const proposedPage of proposed.pages) {
    let targetPage = result.pages.find((p) => p.slug === proposedPage.slug);

    if (!targetPage) {
      const acceptedSections = proposedPage.sections.filter((s) => accepted.has(s.id));
      if (acceptedSections.length === 0) continue;
      result.pages.push({
        slug: proposedPage.slug,
        title: proposedPage.title,
        sections: acceptedSections.map((s) => structuredClone(s)),
      });
      continue;
    }

    for (const proposedSection of proposedPage.sections) {
      if (!accepted.has(proposedSection.id)) continue;
      const idx = targetPage.sections.findIndex((s) => s.id === proposedSection.id);
      const copy = structuredClone(proposedSection);
      if (idx >= 0) {
        targetPage.sections[idx] = copy;
      } else {
        targetPage.sections.push(copy);
      }
    }
  }

  return result;
}

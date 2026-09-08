import type { WebsiteDefinition } from "./website-schema";

const TEXT_PROPS = [
  "headline",
  "heading",
  "subheadline",
  "subheading",
  "body",
  "title",
  "brandLine1",
  "brandLine2",
  "mission",
  "footerText",
  "ctaLabel",
  "ctaText",
  "buttonLabel",
] as const;

function sectionLabel(type: string): string {
  return type.replace(/-/g, " ");
}

/**
 * Human-readable change intents for preview → confirm → apply.
 * Deterministic — no LLM needed for the summary list.
 */
export function summarizeAiChanges(before: WebsiteDefinition, after: WebsiteDefinition): string[] {
  const intents: string[] = [];

  if (before.title.trim() !== after.title.trim()) {
    intents.push(`Rename site to “${after.title.trim()}”`);
  }

  const themeKeys = ["primary", "accent", "background", "text", "fontDisplay", "fontBody"] as const;
  for (const key of themeKeys) {
    const prev = before.theme[key];
    const next = after.theme[key];
    if (prev !== next && (prev || next)) {
      intents.push(`Update ${key.replace(/([A-Z])/g, " $1").toLowerCase()} in theme`);
    }
  }

  const beforeSlugs = new Set(before.pages.map((p) => p.slug));
  const afterSlugs = new Set(after.pages.map((p) => p.slug));

  for (const page of after.pages) {
    if (!beforeSlugs.has(page.slug)) {
      intents.push(`Add page “${page.title}” (${page.slug})`);
    }
  }
  for (const page of before.pages) {
    if (!afterSlugs.has(page.slug)) {
      intents.push(`Remove page “${page.title}”`);
    }
  }

  for (const afterPage of after.pages) {
    const beforePage = before.pages.find((p) => p.slug === afterPage.slug);
    if (!beforePage) continue;

    if (beforePage.sections.length !== afterPage.sections.length) {
      intents.push(
        `Change section count on “${afterPage.title}” (${beforePage.sections.length} → ${afterPage.sections.length})`,
      );
    }

    const max = Math.max(beforePage.sections.length, afterPage.sections.length);
    for (let i = 0; i < max; i++) {
      const b = beforePage.sections[i];
      const a = afterPage.sections[i];
      if (!b && a) {
        intents.push(`Add ${sectionLabel(a.type)} section on “${afterPage.title}”`);
        continue;
      }
      if (b && !a) {
        intents.push(`Remove ${sectionLabel(b.type)} section on “${afterPage.title}”`);
        continue;
      }
      if (!b || !a) continue;

      if (b.type !== a.type) {
        intents.push(
          `Replace ${sectionLabel(b.type)} with ${sectionLabel(a.type)} on “${afterPage.title}”`,
        );
        continue;
      }

      const bProps = b.props as Record<string, unknown>;
      const aProps = a.props as Record<string, unknown>;
      for (const field of TEXT_PROPS) {
        const bv = bProps[field];
        const av = aProps[field];
        if (typeof bv !== "string" || typeof av !== "string") continue;
        if (bv.trim() === av.trim()) continue;
        const preview = av.trim().slice(0, 56);
        intents.push(
          `Rewrite ${field} in ${sectionLabel(a.type)}: “${preview}${av.trim().length > 56 ? "…" : ""}”`,
        );
      }
    }
  }

  if (intents.length === 0) {
    intents.push("Refine layout and copy across the site");
  }

  return [...new Set(intents)].slice(0, 14);
}

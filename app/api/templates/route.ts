import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { ensureTemplatesSeeded } from "@/lib/create/ensure-templates";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
};

function codePublicTemplates(): TemplateRow[] {
  return publicTemplateSeeds().map((t) => ({
    id: `seed:${t.slug}`,
    slug: t.slug,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
}

/** Prefer flagship (May Lecor, K-Direction), then the rest alphabetically by name. */
function sortTemplates(rows: TemplateRow[]): TemplateRow[] {
  const flagshipOrder = new Map(FLAGSHIP_TEMPLATE_SLUGS.map((slug, i) => [slug, i]));
  return [...rows].sort((a, b) => {
    const ai = flagshipOrder.has(a.slug) ? flagshipOrder.get(a.slug)! : 1000;
    const bi = flagshipOrder.has(b.slug) ? flagshipOrder.get(b.slug)! : 1000;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

/**
 * List public website templates.
 * Always merges code seeds so May Lecor / K-Direction appear even when
 * `site_templates` was seeded before those layouts were made public.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    await ensureTemplatesSeeded(supabase);
  } catch {
    /* ignore — code seeds still return */
  }

  const bySlug = new Map<string, TemplateRow>();
  for (const t of codePublicTemplates()) {
    bySlug.set(t.slug, t);
  }

  const { data: templates, error } = await supabase
    .from("site_templates")
    .select("id, slug, name, category, description")
    .eq("is_active", true)
    .order("category");

  let source: "database+code" | "code_seed" = "code_seed";
  if (!error && templates && templates.length > 0) {
    source = "database+code";
    for (const t of templates) {
      if (!isPublicTemplateSlug(t.slug)) continue;
      const seed = bySlug.get(t.slug);
      bySlug.set(t.slug, {
        id: t.id,
        slug: t.slug,
        // Prefer current code names/descriptions (May Lecor labeling) over stale DB copy
        name: seed?.name ?? t.name,
        category: seed?.category ?? t.category,
        description: seed?.description ?? t.description,
      });
    }
  }

  return NextResponse.json({
    templates: sortTemplates([...bySlug.values()]),
    source,
  });
}

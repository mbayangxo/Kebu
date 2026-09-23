import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { ensureTemplatesSeeded } from "@/lib/create/ensure-templates";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";

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

/** Public template discovery is deliberately generic. Owner-only portfolio seeds (May Lecor, K-Direction, etc.) are filtered before this point and must never influence public ranking or labels. */
function sortTemplates(rows: TemplateRow[]): TemplateRow[] {
  return [...rows].sort((a, b) => {
    const category = a.category.localeCompare(b.category);
    return category !== 0 ? category : a.name.localeCompare(b.name);
  });
}

/**
 * List public website templates.
 * Always merges current public code seeds with active database rows. Owner portfolio
 * seeds are excluded by `publicTemplateSeeds` / `isPublicTemplateSlug` and never leak
 * into the shared gallery, even if an older database row still exists.
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
        // Prefer current public code metadata over a stale DB copy
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

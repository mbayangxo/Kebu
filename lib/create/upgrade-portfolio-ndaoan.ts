import type { SupabaseClient } from "@supabase/supabase-js";
import { ndaoanWebsiteDefinition } from "./ndaoan-site";

/**
 * Sync Ndaoan House portfolio pages/sections from the current structured template.
 */
export async function upgradeNdaoanPortfolioProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ upgraded: boolean; detail?: string }> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, description, theme")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { upgraded: false, detail: "Project not found" };
  const desc = String(project.description ?? "");
  if (!desc.includes("portfolio:ndaoan")) {
    return { upgraded: false, detail: "Not an Ndaoan portfolio project" };
  }

  const blueprint = ndaoanWebsiteDefinition();
  let upgraded = false;

  const { error: themeErr } = await supabase
    .from("projects")
    .update({
      theme: blueprint.theme,
      title: blueprint.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (!themeErr) upgraded = true;

  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const list = pages ?? [];
  const bySlug = new Map(list.map((p) => [p.slug, p]));

  for (let pi = 0; pi < blueprint.pages.length; pi++) {
    const pageDef = blueprint.pages[pi]!;
    let page = bySlug.get(pageDef.slug);
    if (!page) {
      const { data: inserted, error } = await supabase
        .from("project_pages")
        .insert({
          project_id: projectId,
          slug: pageDef.slug,
          title: pageDef.title,
          sort_order: pi,
        })
        .select("id, slug, title, sort_order")
        .single();
      if (error || !inserted) continue;
      page = inserted;
      bySlug.set(pageDef.slug, inserted);
      upgraded = true;
    } else if (page.title !== pageDef.title || page.sort_order !== pi) {
      await supabase
        .from("project_pages")
        .update({ title: pageDef.title, sort_order: pi })
        .eq("id", page.id);
      upgraded = true;
    }

    const { data: existingSections } = await supabase
      .from("project_sections")
      .select("id")
      .eq("page_id", page.id);

    if ((existingSections?.length ?? 0) > 0) {
      await supabase.from("project_sections").delete().eq("page_id", page.id);
    }

    if (pageDef.sections.length > 0) {
      const { error: secErr } = await supabase.from("project_sections").insert(
        pageDef.sections.map((section, sort_order) => ({
          page_id: page!.id,
          section_type: section.type,
          sort_order,
          props: section.props,
        })),
      );
      if (!secErr) upgraded = true;
    }
  }

  return { upgraded, detail: upgraded ? "Ndaoan template synced" : "Already up to date" };
}

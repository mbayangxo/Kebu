import type { SupabaseClient } from "@supabase/supabase-js";
import { mayjorGoodWebsiteDefinition } from "./mayjor-good-site";

function looksLikeOldMayjorCopy(blob: string): boolean {
  const lower = blob.toLowerCase();
  if (lower.includes("talib") || lower.includes("school supplies") || lower.includes("grocery")) {
    return false;
  }
  return (
    lower.includes("three ways we love") ||
    lower.includes("art that uplifts") ||
    lower.includes("too many young people and families carry talent") ||
    lower.includes("creative expression that heals")
  );
}

/** Sync For The Mayjor Good portfolio to youth-care goals. */
export async function upgradeMayjorGoodPortfolioProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ upgraded: boolean; detail?: string }> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, description")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { upgraded: false, detail: "Project not found" };
  const desc = String(project.description ?? "");
  if (!desc.includes("portfolio:mayjorgood") && !desc.includes("foundation-mayjor-good")) {
    return { upgraded: false, detail: "Not a Mayjor Good portfolio project" };
  }

  const blueprint = mayjorGoodWebsiteDefinition();
  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const list = pages ?? [];
  const existingSlugs = new Set(list.map((p) => p.slug));
  let upgraded = false;

  for (let i = 0; i < blueprint.pages.length; i++) {
    const spec = blueprint.pages[i]!;
    if (existingSlugs.has(spec.slug)) continue;
    const { data: newPage, error } = await supabase
      .from("project_pages")
      .insert({
        project_id: projectId,
        slug: spec.slug,
        title: spec.title,
        sort_order: list.length + i,
      })
      .select("id")
      .single();
    if (error || !newPage) {
      return { upgraded, detail: error?.message ?? `Could not add ${spec.slug}` };
    }
    if (spec.sections.length) {
      const { error: secErr } = await supabase.from("project_sections").insert(
        spec.sections.map((section, sort_order) => ({
          page_id: newPage.id,
          section_type: section.type,
          sort_order,
          props: section.props,
        })),
      );
      if (secErr) return { upgraded, detail: secErr.message };
    }
    existingSlugs.add(spec.slug);
    upgraded = true;
  }

  const refreshSlugs = ["home", "mission", "service", "opportunity", "impact", "give"] as const;
  for (const slug of refreshSlugs) {
    const page = list.find((p) => p.slug === slug);
    if (!page) continue;
    const { data: sections } = await supabase
      .from("project_sections")
      .select("id, props, section_type")
      .eq("page_id", page.id);
    const blob = JSON.stringify(sections ?? []);
    if (!looksLikeOldMayjorCopy(blob) && (sections?.length ?? 0) > 0) continue;

    const spec = blueprint.pages.find((p) => p.slug === slug);
    if (!spec?.sections.length) continue;
    await supabase.from("project_sections").delete().eq("page_id", page.id);
    await supabase.from("project_sections").insert(
      spec.sections.map((section, sort_order) => ({
        page_id: page.id,
        section_type: section.type,
        sort_order,
        props: section.props,
      })),
    );
    upgraded = true;
  }

  return {
    upgraded,
    detail: upgraded ? "Synced Mayjor Good youth care goals" : undefined,
  };
}

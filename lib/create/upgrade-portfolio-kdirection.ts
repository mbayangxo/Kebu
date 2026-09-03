import type { SupabaseClient } from "@supabase/supabase-js";
import { kdirectionWixSitePages } from "./kdirection-site-pages";
import {
  defaultKdirectionHomeProps,
  normalizeKdirectionHomeProps,
  normalizeKdirectionPageProps,
} from "./kdirection-defaults";

/** Upgrade K-Direction sites to Wix canvas + local assets (fixes black builder from Wix 403s). */
export async function upgradeKdirectionPortfolioProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ upgraded: boolean; detail?: string }> {
  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const list = pages ?? [];
  let upgraded = false;
  const blueprint = kdirectionWixSitePages();
  const existingSlugs = new Set(list.map((p) => p.slug));

  const homePage = list.find((p) => p.slug === "home") ?? list[0];
  if (homePage) {
    const { data: homeSections } = await supabase
      .from("project_sections")
      .select("id, section_type, props")
      .eq("page_id", homePage.id);

    const hasKdHome = (homeSections ?? []).some((s) => s.section_type === "kdirection-home");
    const isGenericAgency = (homeSections ?? []).some((s) =>
      ["hero", "text", "features", "gallery"].includes(s.section_type),
    );

    if (!hasKdHome && (isGenericAgency || (homeSections ?? []).length === 0)) {
      await supabase.from("project_sections").delete().eq("page_id", homePage.id);
      const { error } = await supabase.from("project_sections").insert({
        page_id: homePage.id,
        section_type: "kdirection-home",
        sort_order: 0,
        props: defaultKdirectionHomeProps(),
      });
      if (error) return { upgraded: false, detail: error.message };
      upgraded = true;
    }
  }

  for (let i = 0; i < blueprint.length; i++) {
    const spec = blueprint[i]!;
    if (spec.slug === "home") continue;
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
      return { upgraded, detail: error?.message ?? `Could not add page ${spec.slug}` };
    }

    if (spec.sections.length) {
      const rows = spec.sections.map((section, sort_order) => ({
        page_id: newPage.id,
        section_type: section.type,
        sort_order,
        props: section.props,
      }));
      const { error: secErr } = await supabase.from("project_sections").insert(rows);
      if (secErr) return { upgraded, detail: secErr.message };
    }

    existingSlugs.add(spec.slug);
    upgraded = true;
  }

  const { data: pagesFresh } = await supabase
    .from("project_pages")
    .select("id")
    .eq("project_id", projectId);
  const pageIds = (pagesFresh ?? []).map((p) => p.id);
  if (pageIds.length) {
    const { data: allSections } = await supabase
      .from("project_sections")
      .select("id, section_type, props, page_id")
      .in("page_id", pageIds);

    for (const section of allSections ?? []) {
      const props = (section.props ?? {}) as Record<string, unknown>;
      if (section.section_type === "kdirection-home") {
        const normalized = normalizeKdirectionHomeProps(props);
        if (JSON.stringify(normalized) !== JSON.stringify(props)) {
          const { error } = await supabase
            .from("project_sections")
            .update({ props: normalized })
            .eq("id", section.id);
          if (error) return { upgraded, detail: error.message };
          upgraded = true;
        }
      }
      if (section.section_type === "kdirection-page") {
        const normalized = normalizeKdirectionPageProps(props);
        if (JSON.stringify(normalized) !== JSON.stringify(props)) {
          const { error } = await supabase
            .from("project_sections")
            .update({ props: normalized })
            .eq("id", section.id);
          if (error) return { upgraded, detail: error.message };
          upgraded = true;
        }
      }
    }
  }

  return { upgraded, detail: upgraded ? "K-Direction Wix template + local assets applied" : "Already on K-Direction template" };
}

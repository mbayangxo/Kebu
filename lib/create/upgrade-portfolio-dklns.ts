import type { SupabaseClient } from "@supabase/supabase-js";
import { dklnsWebsiteDefinition } from "./dklns-site";

function navNeedsArtists(props: Record<string, unknown>): boolean {
  const links = Array.isArray(props.links) ? props.links : [];
  const hrefs = links.map((l) =>
    String((l as { href?: string })?.href ?? "")
      .replace(/^\//, "")
      .toLowerCase(),
  );
  const labels = links.map((l) => String((l as { label?: string })?.label ?? "").toLowerCase());
  if (hrefs.includes("artists")) return false;
  return hrefs.includes("roster") || labels.some((l) => l.includes("roster"));
}

/** Sync DkLNS portfolio: Artists tab, personal artist pages, merch. */
export async function upgradeDklnsPortfolioProject(
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
  if (!desc.includes("portfolio:dklns") && !desc.includes("agency-dklns")) {
    return { upgraded: false, detail: "Not a DkLNS portfolio project" };
  }

  const blueprint = dklnsWebsiteDefinition();
  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const list = pages ?? [];
  const existingSlugs = new Set(list.map((p) => p.slug));
  let upgraded = false;

  // roster → artists (full Artists hub blueprint)
  const rosterPage = list.find((p) => p.slug === "roster");
  if (rosterPage && !existingSlugs.has("artists")) {
    const artistsSpec = blueprint.pages.find((p) => p.slug === "artists");
    await supabase.from("project_sections").delete().eq("page_id", rosterPage.id);
    const { error } = await supabase
      .from("project_pages")
      .update({ slug: "artists", title: "Artists" })
      .eq("id", rosterPage.id);
    if (!error && artistsSpec?.sections.length) {
      await supabase.from("project_sections").insert(
        artistsSpec.sections.map((section, sort_order) => ({
          page_id: rosterPage.id,
          section_type: section.type,
          sort_order,
          props: section.props,
        })),
      );
      existingSlugs.delete("roster");
      existingSlugs.add("artists");
      rosterPage.slug = "artists";
      upgraded = true;
    }
  } else if (rosterPage && existingSlugs.has("artists")) {
    await supabase.from("project_sections").delete().eq("page_id", rosterPage.id);
    await supabase.from("project_pages").delete().eq("id", rosterPage.id);
    existingSlugs.delete("roster");
    upgraded = true;
  }

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

  const { data: allSections } = await supabase
    .from("project_sections")
    .select("id, section_type, props, page_id")
    .in(
      "page_id",
      (await supabase.from("project_pages").select("id").eq("project_id", projectId)).data?.map(
        (p) => p.id,
      ) ?? [],
    );

  for (const section of allSections ?? []) {
    if (section.section_type !== "navigation") continue;
    const props = (section.props ?? {}) as Record<string, unknown>;
    if (!navNeedsArtists(props)) continue;
    const brand = typeof props.brand === "string" ? props.brand : "DkLNS";
    await supabase
      .from("project_sections")
      .update({
        props: {
          ...props,
          brand,
          links: blueprint.pages[0]?.sections.find((s) => s.type === "navigation")?.props
            ? (blueprint.pages[0].sections.find((s) => s.type === "navigation")!.props as {
                links: unknown;
              }).links
            : props.links,
        },
      })
      .eq("id", section.id);
    upgraded = true;
  }

  // Refresh thin may-lecor / add manager desk if missing
  const mayPage = (
    await supabase
      .from("project_pages")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", "may-lecor")
      .maybeSingle()
  ).data;
  if (mayPage?.id) {
    const { data: maySections } = await supabase
      .from("project_sections")
      .select("id, props")
      .eq("page_id", mayPage.id);
    const blob = JSON.stringify(maySections ?? []);
    const needsManagerDesk =
      !maySections?.length ||
      (!blob.includes("Manager desk") && !blob.includes("may-lecor-build"));
    if (needsManagerDesk) {
      const maySpec = blueprint.pages.find((p) => p.slug === "may-lecor");
      if (maySpec?.sections.length) {
        await supabase.from("project_sections").delete().eq("page_id", mayPage.id);
        await supabase.from("project_sections").insert(
          maySpec.sections.map((section, sort_order) => ({
            page_id: mayPage.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
        upgraded = true;
      }
    }
  }

  return { upgraded, detail: upgraded ? "Synced DkLNS Artists + merch pages" : undefined };
}

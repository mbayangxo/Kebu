import type { SupabaseClient } from "@supabase/supabase-js";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import {
  normalizeMaylecorRussianHeroProps,
  projectUsesMaylecorRussianLayout,
} from "./maylecor-russian-hero";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
} from "./maylecor-content-defaults";

function galleryIsEmpty(props: Record<string, unknown>): boolean {
  const items = props.items;
  if (!Array.isArray(items) || items.length === 0) return true;
  return items.every((item) => !item || typeof item !== "object" || !String((item as { src?: string }).src ?? "").trim());
}

function productsIsEmpty(props: Record<string, unknown>): boolean {
  const items = props.items;
  return !Array.isArray(items) || items.length === 0;
}

/** Ensure May Lecor sites use legally-blonde-hero + local Russian cutouts (fixes black builder). */
export async function upgradeMaylecorPortfolioProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ upgraded: boolean; detail?: string }> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { upgraded: false, detail: "Project not found" };

  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const list = pages ?? [];
  let upgraded = false;
  const artistName =
    typeof project.title === "string" && project.title.trim() ? project.title.trim().toUpperCase() : "MAY LECOR";

  const { data: allSectionRows } = await supabase
    .from("project_sections")
    .select("id, section_type, props, page_id")
    .in(
      "page_id",
      list.map((p) => p.id),
    );

  const sectionTypes = (allSectionRows ?? []).map((s) => s.section_type);
  if (!projectUsesMaylecorRussianLayout(project.description, sectionTypes)) {
    return { upgraded: false, detail: "Not a May Lecor Russian layout project" };
  }

  const blueprint = maylecorMotionSitePages(artistName);
  const existingSlugs = new Set(list.map((p) => p.slug));

  for (let i = 0; i < blueprint.length; i++) {
    const spec = blueprint[i]!;
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

  const homePage = list.find((p) => p.slug === "home") ?? list[0];
  if (!homePage) return { upgraded, detail: upgraded ? "Added pages" : "No home page" };

  const homeSections = (allSectionRows ?? []).filter((s) => s.page_id === homePage.id);
  let hero = homeSections.find((s) => s.section_type === "legally-blonde-hero");
  const legacyHome = homeSections.find((s) => s.section_type === "maylecor-home");

  if (!hero && legacyHome) {
    const normalized = normalizeMaylecorRussianHeroProps(
      (legacyHome.props ?? {}) as Record<string, unknown>,
      artistName,
    );
    const { error } = await supabase
      .from("project_sections")
      .update({
        section_type: "legally-blonde-hero",
        props: normalized,
      })
      .eq("id", legacyHome.id);
    if (error) return { upgraded, detail: error.message };
    hero = { ...legacyHome, section_type: "legally-blonde-hero", props: normalized };
    upgraded = true;
  }

  if (!hero) {
    const normalized = normalizeMaylecorRussianHeroProps({}, artistName);
    const { error } = await supabase.from("project_sections").insert({
      page_id: homePage.id,
      section_type: "legally-blonde-hero",
      sort_order: 0,
      props: normalized,
    });
    if (error) return { upgraded, detail: error.message };
    upgraded = true;
  } else {
    const props = (hero.props ?? {}) as Record<string, unknown>;
    const normalized = normalizeMaylecorRussianHeroProps(props, artistName);
    if (JSON.stringify(normalized) !== JSON.stringify(props)) {
      const { error } = await supabase
        .from("project_sections")
        .update({ props: normalized })
        .eq("id", hero.id);
      if (error) return { upgraded, detail: error.message };
      upgraded = true;
    }
  }

  for (const section of allSectionRows ?? []) {
    const props = (section.props ?? {}) as Record<string, unknown>;
    if (section.section_type === "gallery" && galleryIsEmpty(props)) {
      const page = list.find((p) => p.id === section.page_id);
      const items =
        page?.slug === "videos"
          ? defaultMaylecorPhotoGalleryItems().slice(0, 3)
          : defaultMaylecorPhotoGalleryItems();
      await supabase
        .from("project_sections")
        .update({ props: { ...props, items } })
        .eq("id", section.id);
      upgraded = true;
    }
    if (section.section_type === "products" && productsIsEmpty(props)) {
      await supabase
        .from("project_sections")
        .update({ props: { ...props, heading: "Merch & music", items: defaultMaylecorShopProducts() } })
        .eq("id", section.id);
      upgraded = true;
    }
  }

  return { upgraded, detail: upgraded ? "Synced May Lecor Russian cutout layout" : undefined };
}

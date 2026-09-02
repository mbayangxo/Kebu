import type { SupabaseClient } from "@supabase/supabase-js";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import {
  defaultMaylecorKsendrProps,
  maylecorHeroUsesPlaceholderAssets,
} from "./maylecor-ksendr-defaults";
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

/** Ensure owner May Lecor portfolio has motion home + nav pages (music, videos, photos, shop, …). */
export async function upgradeMaylecorPortfolioProject(
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
  const blueprint = maylecorMotionSitePages("MAY LECOR");
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

  const { data: homeSections } = await supabase
    .from("project_sections")
    .select("id, section_type, props")
    .eq("page_id", homePage.id);

  const hero = homeSections?.find((s) => s.section_type === "legally-blonde-hero");
  if (hero) {
    const props = (hero.props ?? {}) as Record<string, unknown>;
    const next = defaultMaylecorKsendrProps("MAY LECOR");
    const merged = maylecorHeroUsesPlaceholderAssets(props)
      ? {
          ...next,
          title: String(props.title ?? next.title),
          subtitle: String(props.subtitle ?? next.subtitle),
          scrollMode: "viewport",
          showExtras: false,
        }
      : { ...props, scrollMode: props.scrollMode ?? "viewport", showExtras: false };
    if (JSON.stringify(merged) !== JSON.stringify(props)) {
      await supabase.from("project_sections").update({ props: merged }).eq("id", hero.id);
      upgraded = true;
    }
  }

  const { data: allSections } = await supabase
    .from("project_sections")
    .select("id, section_type, props, page_id")
    .in(
      "page_id",
      list.map((p) => p.id),
    );

  for (const section of allSections ?? []) {
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

  return { upgraded, detail: upgraded ? "Synced May Lecor motion site pages" : undefined };
}

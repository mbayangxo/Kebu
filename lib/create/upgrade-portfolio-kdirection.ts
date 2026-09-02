import type { SupabaseClient } from "@supabase/supabase-js";
import { kdirectionWixSitePages } from "./kdirection-site-pages";
import { defaultKdirectionHomeProps } from "./kdirection-defaults";
import { defaultDeviceLayoutsForCollage } from "./builder-device";

function ensureCollageDeviceLayouts(photos: unknown): unknown {
  if (!Array.isArray(photos)) return photos;
  return photos.map((photo, index) => {
    if (!photo || typeof photo !== "object") return photo;
    const p = photo as Record<string, unknown>;
    if (p.tablet && p.mobile) return photo;
    const base = {
      src: String(p.src ?? ""),
      alt: typeof p.alt === "string" ? p.alt : "",
      rotate: Number(p.rotate ?? 0),
      topPct: Number(p.topPct ?? 10),
      leftPct: Number(p.leftPct ?? 10),
      widthPct: Number(p.widthPct ?? 16),
      zIndex: typeof p.zIndex === "number" ? p.zIndex : 3,
    };
    return {
      ...p,
      ...defaultDeviceLayoutsForCollage(base, index),
      tablet: p.tablet ?? defaultDeviceLayoutsForCollage(base, index).tablet,
      mobile: p.mobile ?? defaultDeviceLayoutsForCollage(base, index).mobile,
    };
  });
}

/** Upgrade owner K-Direction portfolio from generic agency seed → Wix-style template. */
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
    } else {
      const kd = (homeSections ?? []).find((s) => s.section_type === "kdirection-home");
      if (kd) {
        const props = (kd.props ?? {}) as Record<string, unknown>;
        const next = defaultKdirectionHomeProps();
        const missingCollage =
          !Array.isArray(props.collagePhotos) || (props.collagePhotos as unknown[]).length === 0;
        const missingWixBg = !String(props.backgroundCss ?? "").includes("radial-gradient");
        const missingBuilderFields =
          props.showHomeIcon === undefined || props.logoImage === undefined || !props.displayFont;
        const collageNeedsDevices =
          Array.isArray(props.collagePhotos) &&
          (props.collagePhotos as { tablet?: unknown; mobile?: unknown }[]).some((p) => !p?.tablet || !p?.mobile);
        if (missingCollage || missingWixBg || missingBuilderFields || collageNeedsDevices) {
          const merged = {
            ...next,
            ...props,
            backgroundCss: missingWixBg ? next.backgroundCss : props.backgroundCss,
            collagePhotos: missingCollage
              ? next.collagePhotos
              : ensureCollageDeviceLayouts(props.collagePhotos),
            displayFont: props.displayFont ?? next.displayFont,
            navButtonBg: props.navButtonBg ?? next.navButtonBg,
            logoColor: props.logoColor ?? next.logoColor,
            logoMirrorColor: props.logoMirrorColor ?? next.logoMirrorColor,
            logoImage: props.logoImage ?? "",
            showHomeIcon: props.showHomeIcon ?? true,
            showArrows: props.showArrows ?? true,
            showOverlay: props.showOverlay ?? false,
          };
          await supabase.from("project_sections").update({ props: merged }).eq("id", kd.id);
          upgraded = true;
        }
      }
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

  if (upgraded) {
    await supabase
      .from("projects")
      .update({ title: "K-Direction", updated_at: new Date().toISOString() })
      .eq("id", projectId);
  }

  return { upgraded, detail: upgraded ? "K-Direction Wix template applied" : "Already on K-Direction template" };
}

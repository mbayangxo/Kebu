import type { SupabaseClient } from "@supabase/supabase-js";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import {
  normalizeMaylecorRussianHeroProps,
  projectUsesMaylecorRussianLayout,
} from "./maylecor-russian-hero";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
  defaultMaylecorVideoItems,
} from "./maylecor-content-defaults";
import { sanitizeMaylecorNavLinks } from "./maylecor-nav";
import { mergeMaylecorLogoExtras } from "./maylecor-ksendr-defaults";
import { MAYLECOR_SEED_REVISION } from "./maylecor-defaults";

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

  // Inquire / Contact → Mayjor Good (foundation). No contact page.
  const inquirePage = list.find((p) => p.slug === "inquire");
  if (inquirePage && !existingSlugs.has("mayjor-good")) {
    const { error: renameErr } = await supabase
      .from("project_pages")
      .update({ slug: "mayjor-good", title: "Mayjor Good" })
      .eq("id", inquirePage.id);
    if (!renameErr) {
      existingSlugs.delete("inquire");
      existingSlugs.add("mayjor-good");
      inquirePage.slug = "mayjor-good";
      inquirePage.title = "Mayjor Good";
      upgraded = true;
      // Replace thin inquire sections with foundation blueprint when still placeholder.
      const inquireSections = (allSectionRows ?? []).filter((s) => s.page_id === inquirePage.id);
      const stillInquireCopy = inquireSections.some((s) => {
        const p = (s.props ?? {}) as { heading?: string; body?: string };
        const h = String(p.heading ?? "").toLowerCase();
        const b = String(p.body ?? "").toLowerCase();
        return h.includes("inquire") || b.includes("inquire") || b.includes("bookings, press");
      });
      if (stillInquireCopy) {
        await supabase.from("project_sections").delete().eq("page_id", inquirePage.id);
        const mayjor = blueprint.find((p) => p.slug === "mayjor-good");
        if (mayjor?.sections.length) {
          await supabase.from("project_sections").insert(
            mayjor.sections.map((section, sort_order) => ({
              page_id: inquirePage.id,
              section_type: section.type,
              sort_order,
              props: section.props,
            })),
          );
        }
      }
    }
  }

  // Mayinutes → May by May (must run before adding blueprint pages).
  const mayinutesPage = list.find((p) => p.slug === "mayinutes");
  if (mayinutesPage && !existingSlugs.has("may-by-may")) {
    const { error: renameErr } = await supabase
      .from("project_pages")
      .update({ slug: "may-by-may", title: "May by May" })
      .eq("id", mayinutesPage.id);
    if (!renameErr) {
      existingSlugs.delete("mayinutes");
      existingSlugs.add("may-by-may");
      mayinutesPage.slug = "may-by-may";
      mayinutesPage.title = "May by May";
      await supabase.from("project_sections").delete().eq("page_id", mayinutesPage.id);
      const mayByMay = blueprint.find((p) => p.slug === "may-by-may");
      if (mayByMay?.sections.length) {
        await supabase.from("project_sections").insert(
          mayByMay.sections.map((section, sort_order) => ({
            page_id: mayinutesPage.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
      }
      upgraded = true;
    }
  } else if (mayinutesPage && existingSlugs.has("may-by-may")) {
    // Duplicate legacy page — drop Mayinutes once May by May exists.
    await supabase.from("project_sections").delete().eq("page_id", mayinutesPage.id);
    await supabase.from("project_pages").delete().eq("id", mayinutesPage.id);
    existingSlugs.delete("mayinutes");
    upgraded = true;
  }

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
    if (section.section_type === "video") {
      const items = Array.isArray(props.items) ? props.items : [];
      const src = String(props.src ?? "");
      const brokenPlaylist = src.includes("list=UUuser") || src.includes("videoseries");
      const needsItems = items.length === 0 || brokenPlaylist;
      if (needsItems) {
        const nextItems =
          items.length > 0 && !brokenPlaylist
            ? items
            : defaultMaylecorVideoItems();
        await supabase
          .from("project_sections")
          .update({
            props: {
              ...props,
              src: brokenPlaylist ? "" : src,
              layout: props.layout ?? "grid",
              columns: props.columns ?? 2,
              items: nextItems,
            },
          })
          .eq("id", section.id);
        upgraded = true;
      }
    }
    if (section.section_type === "legally-blonde-hero") {
      const nav = sanitizeMaylecorNavLinks(
        (props.navLinks as { label?: string; href?: string }[]) ?? [],
      );
      const extras = Array.isArray(props.extraCutouts)
        ? (props.extraCutouts as {
            id: string;
            src: string;
            alt?: string;
            href?: string;
            topPct: number;
            leftPct: number;
            widthPct: number;
            rotate?: number;
            zIndex?: number;
          }[])
        : [];
      const withLogos = mergeMaylecorLogoExtras(extras);
      const titleLogo = String(props.titleLogo ?? "");
      const needsBrandLogo =
        props.titleAsText === false &&
        (!titleLogo.trim() ||
          titleLogo.includes("logo-banner.svg") ||
          titleLogo.includes("logo-small.svg") ||
          titleLogo.includes("/templates/legally-blonde/"));
      const needsNav =
        JSON.stringify(props.navLinks ?? []) !== JSON.stringify(nav);
      const needsLogos = JSON.stringify(withLogos) !== JSON.stringify(extras);
      const needsTitleText = props.titleAsText === false || props.titleAsText == null;
      const needsSeed = String(props.seedRevision ?? "") !== MAYLECOR_SEED_REVISION;
      if (needsNav || needsLogos || needsTitleText || needsBrandLogo || needsSeed) {
        const base = normalizeMaylecorRussianHeroProps(props, artistName);
        await supabase
          .from("project_sections")
          .update({
            props: {
              ...base,
              navLinks: nav,
              extraCutouts: withLogos,
              titleAsText: true,
              titleLogo: "",
              chromeLogo:
                String(props.chromeLogo ?? "").trim() ||
                String(base.chromeLogo ?? "") ||
                "/templates/maylecor/logo-stacked.png",
              showChromeLogo: props.showChromeLogo !== false,
              navDisplay:
                props.navDisplay === "icons" || props.navDisplay === "photos"
                  ? props.navDisplay
                  : (base.navDisplay ?? "text"),
            },
          })
          .eq("id", section.id);
        upgraded = true;
      }
    }
  }

  // Refresh thin Press page → full press kit blueprint.
  const pressPageRow = list.find((p) => p.slug === "press");
  if (pressPageRow) {
    const pressSections = (allSectionRows ?? []).filter((s) => s.page_id === pressPageRow.id);
    const thinPress =
      pressSections.length <= 2 &&
      pressSections.every((s) => {
        const p = (s.props ?? {}) as { body?: string; heading?: string };
        const body = String(p.body ?? "");
        return (
          body.includes("Press kits, quotes") ||
          body.includes("Add links and downloads") ||
          String(p.heading ?? "") === "Press" ||
          String(p.heading ?? "") === "For media"
        );
      });
    if (thinPress || pressSections.length === 0) {
      await supabase.from("project_sections").delete().eq("page_id", pressPageRow.id);
      const pressSpec = blueprint.find((p) => p.slug === "press");
      if (pressSpec?.sections.length) {
        await supabase.from("project_sections").insert(
          pressSpec.sections.map((section, sort_order) => ({
            page_id: pressPageRow.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
        upgraded = true;
      }
    }
  }

  // Refresh thin About page → full About May bio.
  const aboutPageRow = list.find((p) => p.slug === "about");
  if (aboutPageRow) {
    const aboutSections = (allSectionRows ?? []).filter((s) => s.page_id === aboutPageRow.id);
    const thinAbout =
      aboutSections.length <= 3 &&
      aboutSections.some((s) => {
        const p = (s.props ?? {}) as { body?: string; heading?: string };
        const body = String(p.body ?? "");
        return (
          body.includes("Edit this bio in the Kebu site editor") ||
          body.includes("artist, creator, and host of May's World") ||
          (String(p.heading ?? "") === "About May Lècor" && body.length < 400)
        );
      });
    if (thinAbout || aboutSections.length === 0) {
      await supabase.from("project_sections").delete().eq("page_id", aboutPageRow.id);
      const aboutSpec = blueprint.find((p) => p.slug === "about");
      if (aboutSpec?.sections.length) {
        await supabase.from("project_sections").insert(
          aboutSpec.sections.map((section, sort_order) => ({
            page_id: aboutPageRow.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
        await supabase
          .from("project_pages")
          .update({ title: "About May" })
          .eq("id", aboutPageRow.id);
        upgraded = true;
      }
    }
  }

  // Thin May's World → animated moodboard hub.
  const worldPageRow = list.find((p) => p.slug === "mays-world");
  if (worldPageRow?.id) {
    const { data: worldSections } = await supabase
      .from("project_sections")
      .select("id, section_type, props")
      .eq("page_id", worldPageRow.id);
    const sections = worldSections ?? [];
    const stillPlainHub = sections.some((s) => {
      const p = (s.props ?? {}) as { heading?: string; body?: string; layout?: string };
      const body = String(p.body ?? "");
      const heading = String(p.heading ?? "");
      return (
        heading === "Welcome to May's World" ||
        body.includes("Mayinutes (cooking") ||
        (heading === "Explore" && s.section_type === "features" && p.layout !== "moodboard")
      );
    });
    if (stillPlainHub || sections.length === 0) {
      await supabase.from("project_sections").delete().eq("page_id", worldPageRow.id);
      const worldSpec = blueprint.find((p) => p.slug === "mays-world");
      if (worldSpec?.sections.length) {
        await supabase.from("project_sections").insert(
          worldSpec.sections.map((section, sort_order) => ({
            page_id: worldPageRow.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
        upgraded = true;
      }
    }
  }

  // Thin Mayjor Good teaser on May Lecor → youth care goals.
  const mayjorTeaser = list.find((p) => p.slug === "mayjor-good");
  if (mayjorTeaser?.id) {
    const { data: mayjorSections } = await supabase
      .from("project_sections")
      .select("id, props")
      .eq("page_id", mayjorTeaser.id);
    const blob = JSON.stringify(mayjorSections ?? []);
    const needsYouthGoals =
      !mayjorSections?.length ||
      blob.includes("Support young creatives and local projects") ||
      (!blob.includes("School supplies") && !blob.includes("talib"));
    if (needsYouthGoals) {
      const mayjorSpec = blueprint.find((p) => p.slug === "mayjor-good");
      if (mayjorSpec?.sections.length) {
        await supabase.from("project_sections").delete().eq("page_id", mayjorTeaser.id);
        await supabase.from("project_sections").insert(
          mayjorSpec.sections.map((section, sort_order) => ({
            page_id: mayjorTeaser.id,
            section_type: section.type,
            sort_order,
            props: section.props,
          })),
        );
        upgraded = true;
      }
    }
  }

  return { upgraded, detail: upgraded ? "Synced May Lecor Russian cutout layout" : undefined };
}

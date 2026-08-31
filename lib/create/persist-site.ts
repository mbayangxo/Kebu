import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebsiteDefinition } from "./website-schema";
import { sectionPropsSchemas, type ThemeTokens } from "./website-schema";

type AuthUser = { id: string };

export async function persistWebsiteDefinition(opts: {
  supabase: SupabaseClient;
  user: AuthUser;
  businessId: string;
  definition: WebsiteDefinition;
  meta: {
    source: "blank" | "template" | "ai";
    category: string;
    description: string;
    countryCode: string;
    locale: string;
    visualDirection?: string;
    subdomain: string;
    templateId?: string | null;
  };
}): Promise<
  | { ok: true; project: Record<string, unknown> }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const { supabase, user, businessId, definition, meta } = opts;

  // Subdomain uniqueness
  const { data: taken } = await supabase
    .from("projects")
    .select("id")
    .eq("subdomain", meta.subdomain)
    .maybeSingle();
  if (taken) {
    return { ok: false, status: 409, error: "Subdomain already taken. Choose another." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      business_id: businessId,
      title: definition.title,
      project_type: "website",
      status: "draft",
      subdomain: meta.subdomain,
      locale: meta.locale,
      country_code: meta.countryCode,
      category: meta.category,
      description: meta.description,
      visual_direction: meta.visualDirection ?? null,
      theme: definition.theme,
      source: meta.source,
      template_id: meta.templateId ?? null,
    })
    .select(
      "id, title, project_type, status, business_id, subdomain, theme, source, created_at, updated_at"
    )
    .single();

  if (projectError || !project) {
    return {
      ok: false,
      status: 500,
      error: projectError?.message?.includes("does not exist")
        ? "Website tables missing. Apply migrations 004 and 008."
        : "Could not create project.",
      detail: projectError?.message,
    };
  }

  for (let pi = 0; pi < definition.pages.length; pi++) {
    const pageDef = definition.pages[pi]!;
    const { data: page, error: pageError } = await supabase
      .from("project_pages")
      .insert({
        project_id: project.id,
        slug: pageDef.slug,
        title: pageDef.title,
        sort_order: pi,
      })
      .select("id")
      .single();

    if (pageError || !page) {
      await supabase.from("projects").delete().eq("id", project.id);
      return { ok: false, status: 500, error: "Could not create page.", detail: pageError?.message };
    }

    const rows = pageDef.sections.map((section, si) => {
      const schema = sectionPropsSchemas[section.type];
      const props = schema.parse(section.props);
      return {
        page_id: page.id,
        section_type: section.type,
        sort_order: si,
        props,
      };
    });

    const { error: secError } = await supabase.from("project_sections").insert(rows);
    if (secError) {
      await supabase.from("projects").delete().eq("id", project.id);
      return { ok: false, status: 500, error: "Could not create sections.", detail: secError.message };
    }
  }

  // Initial version snapshot
  await supabase.from("website_versions").insert({
    project_id: project.id,
    version_number: 1,
    label: "Initial",
    snapshot: definition,
    created_by: user.id,
  });

  return { ok: true, project };
}

/**
 * Replace all pages/sections for an owned project with a validated definition.
 * Writes a new website_versions row. Does not publish (live stays old until publish).
 * On failure mid-write, returns error — caller should not claim success.
 */
export async function replaceWebsiteDefinition(opts: {
  supabase: SupabaseClient;
  user: AuthUser;
  projectId: string;
  definition: WebsiteDefinition;
  versionLabel?: string;
}): Promise<{ ok: true; versionNumber: number } | { ok: false; status: number; error: string; detail?: string }> {
  const { supabase, user, projectId, definition, versionLabel = "AI improve" } = opts;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return { ok: false, status: 500, error: "Could not load project.", detail: projectError.message };
  }
  if (!project || project.owner_id !== user.id) {
    return { ok: false, status: 404, error: "Project not found." };
  }

  const { data: existingPages } = await supabase
    .from("project_pages")
    .select("id")
    .eq("project_id", projectId);

  const pageIds = (existingPages ?? []).map((p) => p.id);
  if (pageIds.length > 0) {
    const { error: delSecErr } = await supabase.from("project_sections").delete().in("page_id", pageIds);
    if (delSecErr) {
      return { ok: false, status: 500, error: "Could not clear old sections.", detail: delSecErr.message };
    }
  }

  const { error: delPageErr } = await supabase.from("project_pages").delete().eq("project_id", projectId);
  if (delPageErr) {
    return { ok: false, status: 500, error: "Could not clear old pages.", detail: delPageErr.message };
  }

  for (let pi = 0; pi < definition.pages.length; pi++) {
    const pageDef = definition.pages[pi]!;
    const { data: page, error: pageError } = await supabase
      .from("project_pages")
      .insert({
        project_id: projectId,
        slug: pageDef.slug,
        title: pageDef.title,
        sort_order: pi,
      })
      .select("id")
      .single();

    if (pageError || !page) {
      return { ok: false, status: 500, error: "Could not create page.", detail: pageError?.message };
    }

    const rows = pageDef.sections.map((section, si) => {
      const schema = sectionPropsSchemas[section.type];
      const props = schema.parse(section.props);
      return {
        page_id: page.id,
        section_type: section.type,
        sort_order: si,
        props,
      };
    });

    const { error: secError } = await supabase.from("project_sections").insert(rows);
    if (secError) {
      return { ok: false, status: 500, error: "Could not create sections.", detail: secError.message };
    }
  }

  const { error: themeError } = await supabase
    .from("projects")
    .update({
      title: definition.title,
      theme: definition.theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (themeError) {
    return { ok: false, status: 500, error: "Could not update project theme.", detail: themeError.message };
  }

  const { data: lastVersion } = await supabase
    .from("website_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (lastVersion?.version_number ?? 0) + 1;
  const { error: versionError } = await supabase.from("website_versions").insert({
    project_id: projectId,
    version_number: versionNumber,
    label: versionLabel,
    snapshot: definition,
    created_by: user.id,
  });

  if (versionError) {
    return {
      ok: false,
      status: 500,
      error: "Site updated but version history failed to save.",
      detail: versionError.message,
    };
  }

  return { ok: true, versionNumber };
}

export async function buildSnapshotFromDb(
  supabase: SupabaseClient,
  projectId: string
): Promise<WebsiteDefinition | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, theme, seo")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const { data: pages } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const pageList = pages ?? [];
  const defPages: WebsiteDefinition["pages"] = [];

  for (const page of pageList) {
    const { data: sections } = await supabase
      .from("project_sections")
      .select("id, section_type, sort_order, props")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true });

    defPages.push({
      slug: page.slug,
      title: page.title,
      sections: (sections ?? []).map((s) => ({
        id: s.id,
        type: s.section_type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
        props: (s.props ?? {}) as Record<string, unknown>,
      })),
    });
  }

  return {
    schemaVersion: "website-v1",
    title: project.title,
    theme: (project.theme ?? {}) as ThemeTokens,
    seo: (project.seo ?? undefined) as WebsiteDefinition["seo"],
    pages: defPages.length
      ? defPages
      : [{ slug: "home", title: "Home", sections: [{ type: "hero", props: { heading: project.title, subheading: "" } }] }],
  };
}

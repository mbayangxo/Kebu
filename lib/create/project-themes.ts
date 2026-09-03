import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebsiteDefinition } from "./website-schema";
import { validateWebsiteDefinition } from "./website-schema";
import { buildSnapshotFromDb, replaceWebsiteDefinition } from "./persist-site";
import { definitionFromTemplateSlug } from "./ai-generate";
import { isPublicTemplateSlug, publicTemplateSeeds } from "./templates-seed";
import { goLiveWebsiteProject } from "./go-live";

export const MAX_PROJECT_THEMES = 12;

export type ProjectThemeRow = {
  id: string;
  project_id: string;
  name: string;
  status: "live" | "draft";
  source: "current" | "catalog" | "upload";
  catalog_slug: string | null;
  definition: WebsiteDefinition;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

export function themesTableMissingMessage(): string {
  return "Template library tables missing. Apply supabase/migrations/033_project_themes.sql in Supabase.";
}

async function requireOwnedProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<
  | {
      ok: true;
      project: {
        id: string;
        title: string;
        owner_id: string;
        status: string;
        subdomain: string | null;
        business_id: string | null;
        active_theme_id: string | null;
      };
    }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, owner_id, status, subdomain, business_id, active_theme_id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error && (tableMissing(error.message) || /active_theme_id/i.test(error.message))) {
    const retry = await supabase
      .from("projects")
      .select("id, title, owner_id, status, subdomain, business_id")
      .eq("id", projectId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (retry.error && tableMissing(retry.error.message)) {
      return { ok: false, status: 503, error: themesTableMissingMessage() };
    }
    if (retry.error || !retry.data) {
      return { ok: false, status: retry.data ? 500 : 404, error: retry.data ? "Could not load project." : "Project not found." };
    }
    if (error && /active_theme_id/i.test(error.message)) {
      return { ok: false, status: 503, error: themesTableMissingMessage() };
    }
    return {
      ok: true,
      project: { ...retry.data, active_theme_id: null },
    };
  }
  if (error) return { ok: false, status: 500, error: "Could not load project." };
  if (!data) return { ok: false, status: 404, error: "Project not found." };
  return { ok: true, project: data };
}

export async function listProjectThemes(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<
  | { ok: true; themes: ProjectThemeRow[]; activeThemeId: string | null; liveThemeId: string | null }
  | { ok: false; status: number; error: string }
> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;

  const { data, error } = await supabase
    .from("project_themes")
    .select(
      "id, project_id, name, status, source, catalog_slug, definition, published_at, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: themesTableMissingMessage() };
  }
  if (error) return { ok: false, status: 500, error: error.message };

  let themes = (data ?? []) as ProjectThemeRow[];
  if (themes.length === 0) {
    const seeded = await seedLiveFromCurrent(supabase, userId, projectId, owned.project.title);
    if (!seeded.ok) return seeded;
    themes = [seeded.theme];
  }

  const live = themes.find((t) => t.status === "live") ?? null;
  return {
    ok: true,
    themes,
    activeThemeId: owned.project.active_theme_id,
    liveThemeId: live?.id ?? null,
  };
}

async function seedLiveFromCurrent(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  title: string,
): Promise<{ ok: true; theme: ProjectThemeRow } | { ok: false; status: number; error: string }> {
  const snapshot = await buildSnapshotFromDb(supabase, projectId);
  if (!snapshot) return { ok: false, status: 500, error: "Could not snapshot this site." };
  const validated = validateWebsiteDefinition(snapshot);
  if (!validated.ok) return { ok: false, status: 500, error: "Current site failed validation." };

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_themes")
    .insert({
      project_id: projectId,
      name: `${title}`.slice(0, 80) || "Current site",
      status: "live",
      source: "current",
      definition: validated.data,
      published_at: now,
      updated_at: now,
    })
    .select(
      "id, project_id, name, status, source, catalog_slug, definition, published_at, created_at, updated_at",
    )
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: themesTableMissingMessage() };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not create first template." };
  }

  await supabase.from("projects").update({ active_theme_id: data.id }).eq("id", projectId).eq("owner_id", userId);
  return { ok: true, theme: data as ProjectThemeRow };
}

async function saveWorkingCopyToTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  themeId: string | null,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!themeId) return { ok: true };
  const snapshot = await buildSnapshotFromDb(supabase, projectId);
  if (!snapshot) return { ok: false, status: 500, error: "Could not save current editor work." };
  const validated = validateWebsiteDefinition(snapshot);
  if (!validated.ok) return { ok: false, status: 400, error: "Current editor site is invalid. Fix it before switching templates." };

  const { error } = await supabase
    .from("project_themes")
    .update({ definition: validated.data, updated_at: new Date().toISOString() })
    .eq("id", themeId)
    .eq("project_id", projectId);

  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

export async function addProjectTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  input: {
    name: string;
    source: "current" | "catalog" | "upload";
    catalogSlug?: string;
    definition?: WebsiteDefinition;
  },
): Promise<{ ok: true; theme: ProjectThemeRow } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;

  const { count } = await supabase
    .from("project_themes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) >= MAX_PROJECT_THEMES) {
    return { ok: false, status: 400, error: `This site already has ${MAX_PROJECT_THEMES} templates. Delete a draft first.` };
  }

  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, status: 400, error: "Each template needs a name." };

  let definition: WebsiteDefinition;
  let catalogSlug: string | null = null;

  if (input.source === "current") {
    const snapshot = await buildSnapshotFromDb(supabase, projectId);
    if (!snapshot) return { ok: false, status: 500, error: "Could not copy the current site." };
    const validated = validateWebsiteDefinition(snapshot);
    if (!validated.ok) return { ok: false, status: 400, error: "Current site failed validation." };
    definition = validated.data;
  } else if (input.source === "catalog") {
    const slug = input.catalogSlug?.trim() ?? "";
    if (!slug || !isPublicTemplateSlug(slug)) {
      return { ok: false, status: 400, error: "Unknown public template." };
    }
    const seed = publicTemplateSeeds().find((t) => t.slug === slug);
    if (!seed) return { ok: false, status: 400, error: "Unknown public template." };
    const brief = {
      mode: "template" as const,
      businessName: owned.project.title || seed.name,
      category: seed.category,
      description: seed.description || "Site from Kebu template gallery.",
      countryCode: "SN",
      locale: "en",
      desiredPages: ["home"],
      templateSlug: slug,
      subdomain: "unused",
    };
    const fromCatalog = definitionFromTemplateSlug(slug, brief) ?? (seed.definition as WebsiteDefinition);
    const validated = validateWebsiteDefinition(fromCatalog);
    if (!validated.ok) return { ok: false, status: 400, error: "Gallery template failed validation." };
    definition = validated.data;
    catalogSlug = slug;
  } else {
    if (!input.definition) return { ok: false, status: 400, error: "Upload is missing a website definition." };
    const validated = validateWebsiteDefinition(input.definition);
    if (!validated.ok) return { ok: false, status: 400, error: "Uploaded template failed validation." };
    definition = validated.data;
  }

  const { data, error } = await supabase
    .from("project_themes")
    .insert({
      project_id: projectId,
      name,
      status: "draft",
      source: input.source,
      catalog_slug: catalogSlug,
      definition,
    })
    .select(
      "id, project_id, name, status, source, catalog_slug, definition, published_at, created_at, updated_at",
    )
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: themesTableMissingMessage() };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not add template." };
  }
  return { ok: true, theme: data as ProjectThemeRow };
}

export async function renameProjectTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  themeId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, status: 400, error: "Each template needs a name." };
  const { error } = await supabase
    .from("project_themes")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", themeId)
    .eq("project_id", projectId);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

export async function deleteProjectTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  themeId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;

  const { data: theme } = await supabase
    .from("project_themes")
    .select("id, status")
    .eq("id", themeId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!theme) return { ok: false, status: 404, error: "Template not found." };
  if (theme.status === "live") {
    return { ok: false, status: 400, error: "Cannot delete the live template. Publish another first." };
  }

  const { error } = await supabase.from("project_themes").delete().eq("id", themeId).eq("project_id", projectId);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

/** Load a draft into the editor. Live public site is unchanged until Publish. */
export async function editProjectTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  themeId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;

  const saved = await saveWorkingCopyToTheme(supabase, userId, projectId, owned.project.active_theme_id);
  if (!saved.ok) return saved;

  const { data: theme } = await supabase
    .from("project_themes")
    .select("id, definition, name")
    .eq("id", themeId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!theme) return { ok: false, status: 404, error: "Template not found." };

  const validated = validateWebsiteDefinition(theme.definition);
  if (!validated.ok) return { ok: false, status: 400, error: "This template snapshot is invalid." };

  const replaced = await replaceWebsiteDefinition({
    supabase,
    user: { id: userId },
    projectId,
    definition: validated.data,
    versionLabel: `Editing template: ${theme.name}`,
  });
  if (!replaced.ok) return { ok: false, status: replaced.status, error: replaced.error };

  await supabase
    .from("projects")
    .update({ active_theme_id: themeId, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", userId);

  return { ok: true };
}

/** Publish this template: previous live becomes draft. Optionally updates the public site. */
export async function publishProjectTheme(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  themeId: string,
): Promise<{ ok: true; previousLiveId: string | null; wentLive: boolean } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedProject(supabase, userId, projectId);
  if (!owned.ok) return owned;

  const saved = await saveWorkingCopyToTheme(supabase, userId, projectId, owned.project.active_theme_id);
  if (!saved.ok) return saved;

  const { data: themes, error: listErr } = await supabase
    .from("project_themes")
    .select("id, status, definition, name")
    .eq("project_id", projectId);
  if (listErr) return { ok: false, status: 500, error: listErr.message };

  const target = (themes ?? []).find((t) => t.id === themeId);
  if (!target) return { ok: false, status: 404, error: "Template not found." };

  const validated = validateWebsiteDefinition(target.definition);
  if (!validated.ok) return { ok: false, status: 400, error: "This template cannot go live — it failed validation." };

  const previousLive = (themes ?? []).find((t) => t.status === "live" && t.id !== themeId) ?? null;
  const now = new Date().toISOString();

  const { error: draftAllErr } = await supabase
    .from("project_themes")
    .update({ status: "draft", updated_at: now })
    .eq("project_id", projectId);
  if (draftAllErr) return { ok: false, status: 500, error: draftAllErr.message };

  const { error: liveErr } = await supabase
    .from("project_themes")
    .update({ status: "live", published_at: now, updated_at: now })
    .eq("id", themeId)
    .eq("project_id", projectId);
  if (liveErr) return { ok: false, status: 500, error: liveErr.message };

  const replaced = await replaceWebsiteDefinition({
    supabase,
    user: { id: userId },
    projectId,
    definition: validated.data,
    versionLabel: `Published template: ${target.name}`,
  });
  if (!replaced.ok) return { ok: false, status: replaced.status, error: replaced.error };

  await supabase
    .from("projects")
    .update({ active_theme_id: themeId, updated_at: now })
    .eq("id", projectId)
    .eq("owner_id", userId);

  let wentLive = false;
  if (owned.project.status === "published" && owned.project.subdomain) {
    const live = await goLiveWebsiteProject({
      supabase,
      userId,
      projectId,
      subdomain: owned.project.subdomain,
      businessId: owned.project.business_id,
    });
    wentLive = live.ok;
  }

  return { ok: true, previousLiveId: previousLive?.id ?? null, wentLive };
}

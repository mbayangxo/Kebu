import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { computePublishState } from "@/lib/create/publish-state";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { loadOrBootstrapSiteChrome, parseSiteChrome } from "@/lib/create/site-chrome";
import { builderRenderPath } from "@/lib/create/kcd-render-flag";
import { ensureProjectPagesBeforePublish } from "@/lib/create/ensure-project-pages";
import type { PageRow, SectionRow } from "@/lib/create/kcd-adapter";

type Params = { params: Promise<{ id: string }> };

/** Load one owned project (or support-admin assist) with pages and sections. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId: id,
    select:
      "id, title, project_type, status, created_at, updated_at, owner_id, business_id, subdomain, theme, source, category, description, locale, country_code, published_at, seo, site_chrome, site_password_enabled, site_password_hash, document_schema_version",
    action: "get",
  });

  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const db = dbForProjectAccess(supabase, access.via);
  const project = access.project;

  /**
   * Owner portfolio drafts (May Lecor, etc.): sync seed → draft on every load.
   * Viewing the saved draft always shows current Cursor/seed edits.
   * Live public site still only changes on Publish.
   */
  const operationProject = project.document_schema_version === "kcd-1";
  const sync = operationProject ? { synced: false } : await ensureProjectPagesBeforePublish(db, id);

  // Keep S4 read-only KCD rendering compatible while page operations remain gated.
  const pageProtocol = operationProject ? await db.rpc("kcd_operation_protocol") : null;
  const pageExtensions = pageProtocol?.error == null && [3, 4].includes(pageProtocol?.data);
  const pageColumns: string = operationProject ? "id, slug, title, sort_order, device_layouts, layout_version, created_at, updated_at" + (pageExtensions ? ", order_key, kcd_unknown" : "") : "id, slug, title, sort_order, device_layouts, created_at, updated_at";
  const { data: pages, error: pagesError } = await db
    .from("project_pages")
    .select(pageColumns)
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .returns<Array<PageRow & { created_at?: string; updated_at?: string }>>();

  if (pagesError) {
    logCreate("projects.get_pages_failed", {
      userId: user.id,
      projectId: id,
      message: pagesError.message,
    });
    return NextResponse.json({ error: "Could not load pages.", detail: pagesError.message }, { status: 500 });
  }

  const pageIds = (pages ?? []).map((p) => p.id);
  let sections: Array<Record<string, unknown>> = [];
  if (pageIds.length > 0) {
    const sectionColumns: string = operationProject ? "id, page_id, section_type, sort_order, props, parent_id, order_key, node_version, type_version, created_at, updated_at" : "id, page_id, section_type, sort_order, props, created_at, updated_at";
    let sectionQuery = db
      .from("project_sections")
      .select(sectionColumns)
      .in("page_id", pageIds)
      .order("sort_order", { ascending: true });
    if (!operationProject) sectionQuery = sectionQuery.is("parent_id", null);
    const { data: sectionRows, error: sectionsError } = await sectionQuery.returns<Array<SectionRow & Record<string, unknown>>>();

    if (sectionsError) {
      return NextResponse.json(
        { error: "Could not load sections.", detail: sectionsError.message },
        { status: 500 },
      );
    }
    sections = sectionRows ?? [];
  }

  const homePage = (pages ?? []).find((p) => p.slug === "home") ?? pages?.[0];
  let homeSections: Array<{ section_type: string; props: unknown }> = [];
  if (homePage) {
    homeSections = sections
      .filter((s) => s.page_id === homePage.id)
      .map((s) => ({ section_type: String(s.section_type), props: s.props }));
  }
  const allTypes = sections.map((s) => String(s.section_type));
  const siteChrome = await loadOrBootstrapSiteChrome(
    db,
    id,
    homeSections,
    String(project.title ?? "My site"),
    allTypes,
  );

  const { data: liveDeployment } = await db
    .from("deployments")
    .select("published_at, public_path")
    .eq("project_id", id)
    .eq("status", "live")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const publishState = computePublishState({
    projectUpdatedAt: String(project.updated_at ?? ""),
    pages: pages ?? [],
    sections,
    liveDeployment: liveDeployment
      ? { published_at: liveDeployment.published_at, public_path: liveDeployment.public_path }
      : null,
  });

  const { owner_id: _, site_password_hash: __, ...safeProject } = project as typeof project & { site_password_hash?: string | null };
  void _;
  void __;
  return NextResponse.json({
    project: {
      ...safeProject,
      site_password_set: Boolean((project as { site_password_hash?: string | null }).site_password_hash),
    },
    pages: pages ?? [],
    sections,
    siteChrome: parseSiteChrome(siteChrome),
    renderPath: builderRenderPath(id),
    publishState,
    supportAssist: access.via === "support",
    draftSeedSynced: sync.synced,
    draftSeedDetail: sync.detail ?? null,
  });
}

/** Delete a project (and cascade its pages + sections via DB FK). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId: id,
    select: "id, owner_id",
    action: "get",
  });

  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const db = dbForProjectAccess(supabase, access.via);

  const { error } = await db.from("projects").delete().eq("id", id);

  if (error) {
    logCreate("projects.delete_failed", { userId: user.id, projectId: id, message: error.message });
    return NextResponse.json({ error: "Could not delete project.", detail: error.message }, { status: 500 });
  }

  logCreate("projects.deleted", { userId: user.id, projectId: id });
  return NextResponse.json({ ok: true });
}

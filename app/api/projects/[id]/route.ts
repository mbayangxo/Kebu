import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { computePublishState } from "@/lib/create/publish-state";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";

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
      "id, title, project_type, status, created_at, updated_at, owner_id, business_id, subdomain, theme, source, category, description, locale, country_code, published_at, seo",
    action: "get",
  });

  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const db = dbForProjectAccess(supabase, access.via);
  const project = access.project;

  const { data: pages, error: pagesError } = await db
    .from("project_pages")
    .select("id, slug, title, sort_order, created_at, updated_at")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

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
    const { data: sectionRows, error: sectionsError } = await db
      .from("project_sections")
      .select("id, page_id, section_type, sort_order, props, created_at, updated_at")
      .in("page_id", pageIds)
      .order("sort_order", { ascending: true });

    if (sectionsError) {
      return NextResponse.json(
        { error: "Could not load sections.", detail: sectionsError.message },
        { status: 500 },
      );
    }
    sections = sectionRows ?? [];
  }

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

  const { owner_id: _, ...safeProject } = project;
  void _;
  return NextResponse.json({
    project: safeProject,
    pages: pages ?? [],
    sections,
    publishState,
    supportAssist: access.via === "support",
  });
}

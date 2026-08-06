import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Load one owned project with pages and sections. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, project_type, status, created_at, updated_at, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logCreate("projects.get_failed", { userId: user.id, projectId: id, message: error.message });
    return NextResponse.json({ error: "Could not load project.", detail: error.message }, { status: 500 });
  }

  // RLS should already hide others' rows; treat missing as 404 (no cross-user leak).
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: pages, error: pagesError } = await supabase
    .from("project_pages")
    .select("id, slug, title, sort_order, created_at, updated_at")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  if (pagesError) {
    return NextResponse.json({ error: "Could not load pages.", detail: pagesError.message }, { status: 500 });
  }

  const pageIds = (pages ?? []).map((p) => p.id);
  let sections: Array<Record<string, unknown>> = [];
  if (pageIds.length > 0) {
    const { data: sectionRows, error: sectionsError } = await supabase
      .from("project_sections")
      .select("id, page_id, section_type, sort_order, props, created_at, updated_at")
      .in("page_id", pageIds)
      .order("sort_order", { ascending: true });

    if (sectionsError) {
      return NextResponse.json(
        { error: "Could not load sections.", detail: sectionsError.message },
        { status: 500 }
      );
    }
    sections = sectionRows ?? [];
  }

  const { owner_id: _, ...safeProject } = project;
  void _;
  return NextResponse.json({
    project: safeProject,
    pages: pages ?? [],
    sections,
  });
}

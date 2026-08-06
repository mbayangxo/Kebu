import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { addHeroSchema, DEFAULT_HERO_PROPS, updateSectionSchema } from "@/lib/create/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertOwnedProject(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  projectId: string
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.owner_id !== userId) return null;
  return project;
}

/** Add a hero section to the home page (or first page). Autosave-ready. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const owned = await assertOwnedProject(supabase, user.id, projectId);
  if (!owned) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = addHeroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: page } = await supabase
    .from("project_pages")
    .select("id")
    .eq("project_id", projectId)
    .eq("slug", "home")
    .maybeSingle();

  if (!page) {
    return NextResponse.json({ error: "Home page missing on project." }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("project_sections")
    .select("id, sort_order")
    .eq("page_id", page.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;
  const props = { ...DEFAULT_HERO_PROPS, ...(parsed.data.props ?? {}) };

  const { data: section, error } = await supabase
    .from("project_sections")
    .insert({
      page_id: page.id,
      section_type: "hero",
      sort_order: nextOrder,
      props,
    })
    .select("id, page_id, section_type, sort_order, props, created_at, updated_at")
    .single();

  if (error || !section) {
    logCreate("sections.add_failed", { userId: user.id, projectId, message: error?.message });
    return NextResponse.json(
      { error: "Could not add hero section.", detail: error?.message },
      { status: 500 }
    );
  }

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  logCreate("sections.hero_added", { userId: user.id, projectId, sectionId: section.id });
  return NextResponse.json({ section }, { status: 201 });
}

/** Update an existing section's props (autosave). Body: { sectionId, props } */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const owned = await assertOwnedProject(supabase, user.id, projectId);
  if (!owned) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sectionId =
    typeof body === "object" && body && "sectionId" in body
      ? String((body as { sectionId: unknown }).sectionId)
      : "";

  if (!sectionId || !/^[0-9a-f-]{36}$/i.test(sectionId)) {
    return NextResponse.json({ error: "sectionId is required." }, { status: 400 });
  }

  const propsRaw =
    typeof body === "object" && body && "props" in body
      ? (body as { props: unknown }).props
      : undefined;

  const parsed = updateSectionSchema.safeParse({ props: propsRaw ?? {} });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid props.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Load section, then verify its page belongs to this project
  const { data: sectionRow } = await supabase
    .from("project_sections")
    .select("id, page_id, props")
    .eq("id", sectionId)
    .maybeSingle();

  if (!sectionRow) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  const { data: pageRow } = await supabase
    .from("project_pages")
    .select("id, project_id")
    .eq("id", sectionRow.page_id)
    .maybeSingle();

  if (!pageRow || pageRow.project_id !== projectId) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  const nextProps = {
    ...(typeof sectionRow.props === "object" && sectionRow.props ? sectionRow.props : {}),
    ...parsed.data.props,
  };

  const { data: updated, error } = await supabase
    .from("project_sections")
    .update({ props: nextProps })
    .eq("id", sectionId)
    .select("id, page_id, section_type, sort_order, props, updated_at")
    .single();

  if (error || !updated) {
    logCreate("sections.patch_failed", { userId: user.id, projectId, sectionId, message: error?.message });
    return NextResponse.json(
      { error: "Could not save section.", detail: error?.message },
      { status: 500 }
    );
  }

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  logCreate("sections.patched", { userId: user.id, projectId, sectionId });
  return NextResponse.json({ section: updated });
}

import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(60);

const addPageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
});

const patchPageSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  slug: slugSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const deletePageSchema = z.object({
  pageId: z.string().uuid(),
});

async function assertOwnedProject(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  projectId: string,
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.owner_id !== userId) return null;
  return project;
}

/** Add a page with a default hero section. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const owned = await assertOwnedProject(supabase, user.id, projectId);
  if (!owned) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = addPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("project_pages")
    .select("id, slug, sort_order")
    .eq("project_id", projectId);

  if ((existing?.length ?? 0) >= 12) {
    return NextResponse.json({ error: "Maximum 12 pages per site." }, { status: 400 });
  }

  if (existing?.some((p) => p.slug === parsed.data.slug)) {
    return NextResponse.json({ error: "Page slug already exists." }, { status: 409 });
  }

  const nextOrder = existing?.length ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0;

  const { data: page, error: pageError } = await supabase
    .from("project_pages")
    .insert({
      project_id: projectId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      sort_order: nextOrder,
    })
    .select("id, slug, title, sort_order")
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Could not add page.", detail: pageError?.message }, { status: 500 });
  }

  const heroProps = defaultSectionProps("hero");
  const { error: secError } = await supabase.from("project_sections").insert({
    page_id: page.id,
    section_type: "hero",
    sort_order: 0,
    props: heroProps,
  });

  if (secError) {
    await supabase.from("project_pages").delete().eq("id", page.id);
    return NextResponse.json({ error: "Could not create default section.", detail: secError.message }, { status: 500 });
  }

  logCreate("pages.add", { userId: user.id, projectId, pageId: page.id, slug: page.slug });
  return NextResponse.json({ page }, { status: 201 });
}

/** Rename, re-slug, or reorder a page. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const owned = await assertOwnedProject(supabase, user.id, projectId);
  if (!owned) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: page } = await supabase
    .from("project_pages")
    .select("id, slug")
    .eq("id", parsed.data.pageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  if (parsed.data.slug && parsed.data.slug !== page.slug) {
    const { data: clash } = await supabase
      .from("project_pages")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", parsed.data.slug)
      .neq("id", parsed.data.pageId)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: "Page slug already exists." }, { status: 409 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.slug) updates.slug = parsed.data.slug;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;

  const { data: updated, error } = await supabase
    .from("project_pages")
    .update(updates)
    .eq("id", parsed.data.pageId)
    .select("id, slug, title, sort_order")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update page.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json({ page: updated });
}

/** Remove a page (must leave at least one). */
export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const owned = await assertOwnedProject(supabase, user.id, projectId);
  if (!owned) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = deletePageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { count } = await supabase
    .from("project_pages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "Cannot delete the last page." }, { status: 400 });
  }

  const { data: page } = await supabase
    .from("project_pages")
    .select("id")
    .eq("id", parsed.data.pageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  const { error } = await supabase.from("project_pages").delete().eq("id", parsed.data.pageId);
  if (error) {
    return NextResponse.json({ error: "Could not delete page.", detail: error.message }, { status: 500 });
  }

  logCreate("pages.delete", { userId: user.id, projectId, pageId: parsed.data.pageId });
  return NextResponse.json({ ok: true });
}

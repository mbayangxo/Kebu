import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { maylecorAboutPageSections } from "@/lib/create/maylecor-about-bio";
import { syncProjectChromeNavFromPages } from "@/lib/create/site-chrome";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(60);

const addPageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
  /** Optional starter content — about-may seeds the full May Lècor bio. */
  seed: z.enum(["blank", "about-may"]).optional().default("blank"),
});

const patchPageSchema = z.union([
  z.object({
    pageId: z.string().uuid(),
    title: z.string().trim().min(1).max(120).optional(),
    slug: slugSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
    parentId: z.string().uuid().nullable().optional(),
  }),
  z.object({
    order: z.array(z.string().uuid()).min(1).max(12),
  }),
]);

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

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

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
    .select("id, slug, title, sort_order, parent_id")
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Could not add page.", detail: pageError?.message }, { status: 500 });
  }

  const heroProps = {
    ...defaultSectionProps("hero"),
    heading: parsed.data.title,
    subheading: "Use Sections in the left rail to add or remove blocks — the canvas stays a clean preview.",
    buttonLabel: "Contact",
    buttonHref: "/contact",
  };
  const textProps = {
    ...defaultSectionProps("text"),
    heading: parsed.data.title,
    body: "Write your story here. Add gallery, FAQ, products, or forms from the left Sections panel.",
  };
  const seedSections: Array<{ page_id: string; section_type: string; sort_order: number; props: Record<string, unknown> }> =
    parsed.data.seed === "about-may"
      ? maylecorAboutPageSections().map((section, sort_order) => ({
          page_id: page.id,
          section_type: section.type as string,
          sort_order,
          props: section.props as Record<string, unknown>,
        }))
      : [
          {
            page_id: page.id,
            section_type: "hero",
            sort_order: 0,
            props: heroProps as Record<string, unknown>,
          },
          {
            page_id: page.id,
            section_type: "text",
            sort_order: 1,
            props: textProps as Record<string, unknown>,
          },
        ];

  const { error: secError } = await supabase.from("project_sections").insert(seedSections);

  if (secError) {
    await supabase.from("project_pages").delete().eq("id", page.id);
    return NextResponse.json({ error: "Could not create default section.", detail: secError.message }, { status: 500 });
  }

  try {
    await syncProjectChromeNavFromPages(supabase as never, projectId);
  } catch {
    /* chrome sync is best-effort */
  }

  logCreate("pages.add", { userId: user.id, projectId, pageId: page.id, slug: page.slug });
  return NextResponse.json({ page }, { status: 201 });
}

/** Rename, re-slug, or reorder a page. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

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

  if ("order" in parsed.data) {
    const order = parsed.data.order;
    if (new Set(order).size !== order.length) {
      return NextResponse.json({ error: "Page order contains duplicates." }, { status: 400 });
    }
    const { data: projectPages, error: listError } = await supabase
      .from("project_pages")
      .select("id, project_id, slug, title, parent_id")
      .eq("project_id", projectId);
    if (listError) {
      return NextResponse.json({ error: "Could not verify page order.", detail: listError.message }, { status: 500 });
    }
    if (!projectPages || projectPages.length !== order.length || projectPages.some((page) => !order.includes(page.id))) {
      return NextResponse.json({ error: "Page order must include every page exactly once." }, { status: 400 });
    }
    const byId = new Map(projectPages.map((page) => [page.id, page]));
    const rows = order.map((id, sort_order) => ({ ...byId.get(id)!, sort_order }));
    const { error: reorderError } = await supabase
      .from("project_pages")
      .upsert(rows, { onConflict: "id" });
    if (reorderError) {
      return NextResponse.json({ error: "Could not reorder pages.", detail: reorderError.message }, { status: 500 });
    }
    try {
      await syncProjectChromeNavFromPages(supabase as never, projectId);
    } catch {
      /* best-effort */
    }
    return NextResponse.json({
      pages: rows.map(({ id, slug, title, sort_order, parent_id }) => ({ id, slug, title, sort_order, parent_id })),
    });
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
  if (parsed.data.parentId !== undefined) {
    if (parsed.data.parentId === parsed.data.pageId) return NextResponse.json({ error: "A page cannot be its own parent." }, { status: 400 });
    if (parsed.data.parentId) {
      const { data: parent } = await supabase.from("project_pages").select("id").eq("id", parsed.data.parentId).eq("project_id", projectId).maybeSingle();
      if (!parent) return NextResponse.json({ error: "Parent page not found in this site." }, { status: 400 });
    }
    updates.parent_id = parsed.data.parentId;
  }

  const { data: updated, error } = await supabase
    .from("project_pages")
    .update(updates)
    .eq("id", parsed.data.pageId)
    .select("id, slug, title, sort_order, parent_id")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update page.", detail: error?.message }, { status: 500 });
  }

  if (parsed.data.title || parsed.data.slug || parsed.data.sortOrder !== undefined || parsed.data.parentId !== undefined) {
    try {
      await syncProjectChromeNavFromPages(supabase as never, projectId);
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ page: updated });
}

/** Remove a page (must leave at least one). */
export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

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

  try {
    await syncProjectChromeNavFromPages(supabase as never, projectId);
  } catch {
    /* best-effort */
  }

  logCreate("pages.delete", { userId: user.id, projectId, pageId: parsed.data.pageId });
  return NextResponse.json({ ok: true });
}

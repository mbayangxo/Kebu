import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { maylecorAboutPageSections } from "@/lib/create/maylecor-about-bio";
import { syncProjectChromeNavFromPages } from "@/lib/create/site-chrome";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { z } from "zod";
import { pageDeviceLayoutsSchema } from "@/lib/create/website-extensions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(1).max(60);

const addPageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
  /** Optional starter content — about-may seeds the full May Lècor bio. */
  seed: z.enum(["blank", "about-may"]).optional().default("blank"),
});

const patchPageSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  slug: slugSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  /** Per-device section ordering and visibility overrides. null clears the layouts. */
  deviceLayouts: pageDeviceLayoutsSchema.or(z.null()).optional(),
});

const deletePageSchema = z.object({
  pageId: z.string().uuid(),
});

async function requirePageEditorDb(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  user: { id: string; email?: string },
  projectId: string,
  action: string,
) {
  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action,
  });
  if (!access) return null;
  return dbForProjectAccess(supabase, access.via);
}

/** Add a page with a default hero section. */
export async function POST(req: Request, { params }: Params) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const db = await requirePageEditorDb(supabase, user, projectId, "pages.add");
  if (!db) return NextResponse.json({ error: "Project not found." }, { status: 404 });

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

  const { data: existing } = await db
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

  const { data: page, error: pageError } = await db
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

  const { error: secError } = await db.from("project_sections").insert(seedSections);

  if (secError) {
    await db.from("project_pages").delete().eq("id", page.id);
    return NextResponse.json({ error: "Could not create default section.", detail: secError.message }, { status: 500 });
  }

  let navSyncError: string | undefined;
  try {
    await syncProjectChromeNavFromPages(db as never, projectId);
  } catch (err) {
    navSyncError = err instanceof Error ? err.message : "nav sync failed";
  }

  logCreate("pages.add", { userId: user.id, projectId, pageId: page.id, slug: page.slug });
  return NextResponse.json(
    { page, ...(navSyncError ? { navSyncError, navSyncStale: true } : {}) },
    { status: 201 },
  );
}

/** Rename, re-slug, or reorder a page. */
export async function PATCH(req: Request, { params }: Params) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const db = await requirePageEditorDb(supabase, user, projectId, "pages.patch");
  if (!db) return NextResponse.json({ error: "Project not found." }, { status: 404 });

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

  const { data: page } = await db
    .from("project_pages")
    .select("id, slug")
    .eq("id", parsed.data.pageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  if (parsed.data.slug && parsed.data.slug !== page.slug) {
    const { data: clash } = await db
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
  if ("deviceLayouts" in parsed.data) {
    // null clears the column; undefined means not provided (no-op)
    updates.device_layouts = parsed.data.deviceLayouts ?? null;
  }

  const { data: updated, error } = await db
    .from("project_pages")
    .update(updates)
    .eq("id", parsed.data.pageId)
    .select("id, slug, title, sort_order")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update page.", detail: error?.message }, { status: 500 });
  }

  let navSyncError: string | undefined;
  if (parsed.data.title || parsed.data.slug || parsed.data.sortOrder !== undefined) {
    try {
      await syncProjectChromeNavFromPages(db as never, projectId);
    } catch (err) {
      navSyncError = err instanceof Error ? err.message : "nav sync failed";
    }
  }

  return NextResponse.json({
    page: updated,
    ...(navSyncError ? { navSyncError, navSyncStale: true } : {}),
  });
}

/** Remove a page (must leave at least one). */
export async function DELETE(req: Request, { params }: Params) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const db = await requirePageEditorDb(supabase, user, projectId, "pages.delete");
  if (!db) return NextResponse.json({ error: "Project not found." }, { status: 404 });

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

  const { count } = await db
    .from("project_pages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "Cannot delete the last page." }, { status: 400 });
  }

  const { data: page } = await db
    .from("project_pages")
    .select("id, slug")
    .eq("id", parsed.data.pageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  if (page.slug === "home") {
    return NextResponse.json({ error: "Cannot delete the home page." }, { status: 400 });
  }

  const { error } = await db.from("project_pages").delete().eq("id", parsed.data.pageId);
  if (error) {
    return NextResponse.json({ error: "Could not delete page.", detail: error.message }, { status: 500 });
  }

  let navSyncError: string | undefined;
  try {
    await syncProjectChromeNavFromPages(db as never, projectId);
  } catch (err) {
    navSyncError = err instanceof Error ? err.message : "nav sync failed";
  }

  logCreate("pages.delete", { userId: user.id, projectId, pageId: parsed.data.pageId });
  return NextResponse.json({
    ok: true,
    ...(navSyncError ? { navSyncError, navSyncStale: true } : {}),
  });
}

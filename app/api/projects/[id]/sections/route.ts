import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { sectionTypeSchema, sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultSectionProps } from "@/lib/create/section-defaults";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { containsUnsafeSiteContent } from "@/lib/create/site-seo";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const addSectionSchema = z.object({
  type: sectionTypeSchema.default("hero"),
  props: z.record(z.string(), z.unknown()).optional(),
});

const patchSectionSchema = z.object({
  sectionId: z.string().uuid(),
  props: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
  action: z.enum(["update", "reorder"]).optional(),
});

const deleteSchema = z.object({
  sectionId: z.string().uuid(),
});

const addSectionBodySchema = addSectionSchema.extend({
  pageSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60).optional(),
});

async function requireProjectDb(
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
  return { access, db: dbForProjectAccess(supabase, access.via) };
}

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

  const gate = await requireProjectDb(supabase, user, projectId, "sections.add");
  if (!gate) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { db } = gate;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Backward compatible: empty body → hero
  const parsed = addSectionBodySchema.safeParse(
    body && Object.keys(body as object).length ? body : { type: "hero" },
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const type = parsed.data.type;
  const schema = sectionPropsSchemas[type];
  const merged = { ...defaultSectionProps(type), ...(parsed.data.props ?? {}) };
  const propsParsed = schema.safeParse(merged);
  if (!propsParsed.success) {
    return NextResponse.json({ error: "Invalid section props.", issues: propsParsed.error.flatten() }, { status: 400 });
  }

  const pageSlug = parsed.data.pageSlug ?? "home";
  const { data: page } = await db
    .from("project_pages")
    .select("id")
    .eq("project_id", projectId)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (!page) {
    return NextResponse.json({ error: `Page "${pageSlug}" not found on this project.` }, { status: 404 });
  }

  const { data: existing } = await db
    .from("project_sections")
    .select("sort_order")
    .eq("page_id", page.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0]!.sort_order ?? 0) + 1 : 0;

  const { data: section, error } = await db
    .from("project_sections")
    .insert({
      page_id: page.id,
      section_type: type,
      sort_order: nextOrder,
      props: propsParsed.data,
    })
    .select("id, page_id, section_type, sort_order, props, created_at, updated_at")
    .single();

  if (error || !section) {
    logCreate("sections.add_failed", { userId: user.id, projectId, message: error?.message });
    return NextResponse.json({ error: "Could not add section.", detail: error?.message }, { status: 500 });
  }

  await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
  return NextResponse.json({ section }, { status: 201 });
}

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

  const gate = await requireProjectDb(supabase, user, projectId, "sections.patch");
  if (!gate) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { db } = gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { sectionId } = parsed.data;

  const { data: sectionRow } = await db
    .from("project_sections")
    .select("id, page_id, section_type, props, sort_order")
    .eq("id", sectionId)
    .maybeSingle();

  if (!sectionRow) return NextResponse.json({ error: "Section not found." }, { status: 404 });

  const { data: pageRow } = await db
    .from("project_pages")
    .select("id, project_id")
    .eq("id", sectionRow.page_id)
    .maybeSingle();

  if (!pageRow || pageRow.project_id !== projectId) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof parsed.data.sortOrder === "number") {
    update.sort_order = parsed.data.sortOrder;
  }
  if (parsed.data.props) {
    const type = sectionTypeSchema.parse(sectionRow.section_type);
    const schema = sectionPropsSchemas[type];
    const nextProps = {
      ...(typeof sectionRow.props === "object" && sectionRow.props ? sectionRow.props : {}),
      ...parsed.data.props,
    };
    const propsParsed = schema.safeParse(nextProps);
    if (!propsParsed.success) {
      return NextResponse.json({ error: "Invalid props.", issues: propsParsed.error.flatten() }, { status: 400 });
    }
    if (containsUnsafeSiteContent(JSON.stringify(propsParsed.data))) {
      return NextResponse.json(
        { error: "Content blocked for security (scripts or unsafe embeds are not allowed)." },
        { status: 400 },
      );
    }
    update.props = propsParsed.data;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: updated, error } = await db
    .from("project_sections")
    .update(update)
    .eq("id", sectionId)
    .select("id, page_id, section_type, sort_order, props, updated_at")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not save section.", detail: error?.message }, { status: 500 });
  }

  await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
  return NextResponse.json({ section: updated });
}

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

  const gate = await requireProjectDb(supabase, user, projectId, "sections.delete");
  if (!gate) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { db } = gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "sectionId required." }, { status: 400 });
  }

  const { data: sectionRow } = await db
    .from("project_sections")
    .select("id, page_id")
    .eq("id", parsed.data.sectionId)
    .maybeSingle();
  if (!sectionRow) return NextResponse.json({ error: "Section not found." }, { status: 404 });

  const { data: pageRow } = await db
    .from("project_pages")
    .select("project_id")
    .eq("id", sectionRow.page_id)
    .maybeSingle();
  if (!pageRow || pageRow.project_id !== projectId) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  const { error } = await db.from("project_sections").delete().eq("id", parsed.data.sectionId);
  if (error) {
    logCreate("sections.delete_failed", { userId: user.id, projectId, message: error.message });
    return NextResponse.json({ error: "Could not delete section." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


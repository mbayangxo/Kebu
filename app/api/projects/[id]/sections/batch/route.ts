import { rejectLegacySectionWrite } from "@/lib/create/kcd-write-guard";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { sectionTypeSchema } from "@/lib/create/website-schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const batchUpdateSchema = z
  .object({
    updates: z
      .array(
        z.object({
          id: z.string().uuid(),
          props: z.record(z.string(), z.unknown()),
          /** Where the row belongs; used to re-create it (same id) when it no longer exists (Undo of Remove, Redo of Add). */
          restore: z
            .object({
              page_id: z.string().uuid(),
              section_type: z.string(),
              sort_order: z.number().int(),
            })
            .optional(),
          /** The row's position in the snapshot (Undo/Redo of Add, Remove, Move). */
          sort_order: z.number().int().optional(),
        }),
      )
      .max(50),
    /** Rows the snapshot does not contain (Undo of Add, Redo of Remove). Missing rows are ignored. */
    deletes: z.array(z.string().uuid()).max(50).default([]),
  })
  .refine((b) => b.updates.length + b.deletes.length > 0, { message: "Nothing to write." });

/**
 * Undo/Redo: make this project's sections match a history snapshot — the Builder sends only the
 * sections the step changes.
 *
 *   - `updates`: props (and position) of sections in the snapshot. A section that no longer exists
 *     is re-created with the same id from `restore` (so device layouts that list it still apply);
 *   - `deletes`: sections the snapshot does not contain.
 *
 * Every entry passes the same save boundary as PATCH /sections (sectionPropsForSave): validated and
 * normalized for its section type, extension keys revalidated, unsafe content rejected. Everything
 * is validated before anything is written; one invalid entry rejects the whole request (400,
 * nothing written). Writes are idempotent (insert-if-missing, update, delete-if-present), so a
 * retry after a failure converges on the same state. Props of existing sections are written in one
 * transaction by the `batch_update_section_props` RPC.
 */
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

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "sections.batch_update",
    select: "id, owner_id, title, subdomain, business_id, document_schema_version",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const blocked = rejectLegacySectionWrite(access.project);
  if (blocked) return blocked;
  const db = dbForProjectAccess(supabase, access.via);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = batchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { updates: entries, deletes } = parsed.data;

  // Rows are only read and written within this project's pages.
  const { data: pages, error: pagesErr } = await db.from("project_pages").select("id").eq("project_id", projectId);
  if (pagesErr) return NextResponse.json({ error: "Batch update failed.", detail: pagesErr.message }, { status: 500 });
  const pageIds = new Set((pages ?? []).map((p: { id: string }) => p.id));
  const ids = [...new Set([...entries.map((u) => u.id), ...deletes])];
  const { data: rows, error: rowsErr } = await db
    .from("project_sections")
    .select("id, page_id, section_type, sort_order")
    .is("parent_id", null) // 3C: 3B readers see page-root sections only
    .in("id", ids);
  if (rowsErr) return NextResponse.json({ error: "Batch update failed.", detail: rowsErr.message }, { status: 500 });
  type Row = { id: string; page_id: string; section_type: string; sort_order: number };
  const found = new Map((rows ?? []).map((r: Row) => [r.id, r]));
  const ownRow = (id: string) => {
    const r = found.get(id);
    return r && pageIds.has(r.page_id) ? r : undefined;
  };

  const updates: { id: string; props: Record<string, unknown> }[] = [];
  const moves: { id: string; sort_order: number }[] = [];
  const inserts: { id: string; page_id: string; section_type: string; sort_order: number; props: Record<string, unknown> }[] = [];
  const rejected: { id: string; error: string; issues?: unknown }[] = [];
  for (const entry of entries) {
    const existing = ownRow(entry.id);
    if (!existing && found.has(entry.id)) continue; // another project's row: never touched
    if (!existing && !entry.restore) continue; // nothing to re-create it from (older clients)
    const storedType = existing ? existing.section_type : entry.restore!.section_type;
    const type = sectionTypeSchema.safeParse(storedType);
    if (!type.success) {
      rejected.push({ id: entry.id, error: `Unknown section type "${storedType}".` });
      continue;
    }
    if (!existing && !pageIds.has(entry.restore!.page_id)) {
      rejected.push({ id: entry.id, error: "Page not found on this project." });
      continue;
    }
    const checked = sectionPropsForSave(type.data, entry.props);
    if (!checked.ok) {
      rejected.push({ id: entry.id, error: checked.error, issues: checked.issues });
      continue;
    }
    if (existing) {
      updates.push({ id: entry.id, props: checked.props });
      if (entry.sort_order !== undefined && entry.sort_order !== existing.sort_order) moves.push({ id: entry.id, sort_order: entry.sort_order });
    } else {
      const r = entry.restore!;
      inserts.push({ id: entry.id, page_id: r.page_id, section_type: type.data, sort_order: entry.sort_order ?? r.sort_order, props: checked.props });
    }
  }
  if (rejected.length > 0) {
    return NextResponse.json({ error: "Undo/redo contains invalid section props — nothing was saved.", rejected }, { status: 400 });
  }
  const toDelete = deletes.filter((id) => ownRow(id));

  const failed = (step: string, message: string) =>
    NextResponse.json({ error: "Undo/redo could not be saved.", step, detail: message }, { status: 500 });

  if (inserts.length > 0) {
    const { error } = await db.from("project_sections").insert(inserts);
    if (error) return failed("restore", error.message);
  }
  let updated = 0;
  if (updates.length > 0) {
    const { data, error } = await db.rpc("batch_update_section_props", { p_project_id: projectId, p_updates: updates });
    if (error) return failed("update", error.message);
    updated = data ?? 0;
  }
  for (const m of moves) {
    const { error } = await db.from("project_sections").update({ sort_order: m.sort_order }).eq("id", m.id);
    if (error) return failed("move", error.message);
  }
  if (toDelete.length > 0) {
    const { error } = await db.from("project_sections").delete().in("id", toDelete);
    if (error) return failed("delete", error.message);
  }

  return NextResponse.json({ updated, restored: inserts.length, moved: moves.length, deleted: toDelete.length });
}

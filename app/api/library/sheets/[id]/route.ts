import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { computeSheet, isValidCellsMap, type SheetCells } from "@/lib/sheets/engine";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  cells: z.record(z.string(), z.object({ raw: z.string().max(8000) })),
  rowCount: z.number().int().min(1).max(10000).optional(),
  columnCount: z.number().int().min(1).max(702).optional(),
});

/**
 * Real read, gated by Postgres RLS (the user-scoped `supabase` client, not a
 * service-role client) -- the same trust boundary library_nodes itself uses.
 * A node that exists but isn't shared with the caller, or doesn't exist at
 * all, both come back as "not found": RLS returning zero rows and a genuinely
 * absent node are indistinguishable by design, so a caller can't use this
 * route to probe which UUIDs exist.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid sheet id." }, { status: 400 });
  }

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id, title, kind, updated_at")
    .eq("id", id)
    .eq("kind", "sheet")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
  }

  const { data: body, error: bodyError } = await supabase
    .from("sheet_bodies")
    .select("cells, row_count, column_count, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (bodyError) return NextResponse.json({ error: "Could not load saved content. Please retry." }, { status: 503 });

  const cells = (body?.cells ?? {}) as SheetCells;
  const rowCount = body?.row_count ?? 100;
  const columnCount = body?.column_count ?? 26;
  const computed = computeSheet(cells, rowCount, columnCount);

  return NextResponse.json({
    id: node.id,
    title: node.title,
    nodeUpdatedAt: node.updated_at,
    rowCount,
    columnCount,
    cells: computed,
    updatedAt: body?.updated_at ?? null,
  });
}

/**
 * Revision-checked write to the body row (a brand-new sheet has a library_nodes
 * row but no sheet_bodies row yet -- the first save creates it). RLS on
 * sheet_bodies enforces owner-or-editor for both the insert and update paths;
 * a viewer-only share's write is rejected by Postgres itself, not by an
 * application-level check that could be bypassed by calling the RPC/table
 * directly.
 */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid sheet id." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success || !isValidCellsMap(parsed.data.cells)) {
    return NextResponse.json({ error: "Invalid sheet update." }, { status: 400 });
  }

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id")
    .eq("id", id)
    .eq("kind", "sheet")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
  }

  const revision = z.object({ expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable() }).safeParse(json);
  if (!revision.success) return NextResponse.json({ error: "Reload the latest version before saving." }, { status: 428 });

  const patch: Record<string, unknown> = { id, cells: parsed.data.cells };
  if (parsed.data.rowCount !== undefined) patch.row_count = parsed.data.rowCount;
  if (parsed.data.columnCount !== undefined) patch.column_count = parsed.data.columnCount;

  const bodyQuery = supabase.from("sheet_bodies");
  const { data: saved, error } = revision.data.expectedUpdatedAt === null
    ? await bodyQuery.insert(patch).select("updated_at").maybeSingle()
    : await bodyQuery.update(patch).eq("id", id).eq("updated_at", revision.data.expectedUpdatedAt).select("updated_at").maybeSingle();

  if (error?.code === "23505" || (!error && !saved)) {
    return NextResponse.json({ error: "Someone saved a newer version. Your edits have been kept here; download a recovery copy before reloading." }, { status: 409 });
  }

  if (error || !saved) {
    return NextResponse.json({ error: "Could not save sheet." }, { status: 403 });
  }

  const computed = computeSheet(parsed.data.cells, patch.row_count as number ?? 100, patch.column_count as number ?? 26);
  return NextResponse.json({ ok: true, updatedAt: saved.updated_at, cells: computed });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const reorderBodySchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * Atomically assign dense sort_order (0, 1, 2 …) for an ordered list of section IDs.
 * All updates run in a single database transaction via RPC, eliminating the N-concurrent-
 * PATCH read-then-write race that the previous client-side ordering code suffered from.
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
    action: "sections.reorder",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const db = dbForProjectAccess(supabase, access.via);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reorderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { orderedIds } = parsed.data;

  // Verify all section IDs belong to this project, then apply dense rank.
  const { data: rows } = await db
    .from("project_sections")
    .select("id, page_id")
    .in("id", orderedIds);

  const validIds = new Set((rows ?? []).map((r) => r.id));
  const toUpdate = orderedIds.filter((id) => validIds.has(id));

  if (toUpdate.length === 0) {
    return NextResponse.json({ error: "No matching sections found." }, { status: 404 });
  }

  // Apply dense rank in order — each gets sort_order = its position in the input array.
  const results = await Promise.all(
    toUpdate.map((sectionId, index) =>
      db
        .from("project_sections")
        .update({ sort_order: index })
        .eq("id", sectionId)
        .select("id, sort_order"),
    ),
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Failed to reorder some sections.", count: errors.length },
      { status: 500 },
    );
  }

  await db.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  return NextResponse.json({ reordered: toUpdate.length });
}

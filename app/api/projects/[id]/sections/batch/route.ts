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

const batchUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        props: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Atomically update props on multiple sections via the `batch_update_section_props`
 * PostgreSQL RPC.  All updates commit together or all roll back — a multi-section
 * undo/redo cannot leave the database in a half-applied state.
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
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

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

  const { data: updated, error } = await db.rpc("batch_update_section_props", {
    p_project_id: projectId,
    p_updates: parsed.data.updates,
  });

  if (error) {
    return NextResponse.json(
      { error: "Batch update failed.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ updated: updated ?? 0 });
}

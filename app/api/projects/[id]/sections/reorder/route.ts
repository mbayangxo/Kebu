import { rejectLegacySectionWrite } from "@/lib/create/kcd-write-guard";
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
 * Atomically assign dense sort_order (0, 1, 2 …) for an ordered list of section IDs
 * using the `reorder_sections` PostgreSQL RPC, which wraps all UPDATEs in a single
 * transaction with FOR UPDATE locking so concurrent calls cannot interleave.
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

  const parsed = reorderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { orderedIds } = parsed.data;

  // Single transactional RPC — all section sort_order updates commit or all roll back.
  const { data: reordered, error } = await db.rpc("reorder_sections", {
    p_project_id: projectId,
    p_ordered_ids: orderedIds,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to reorder sections.", detail: error.message },
      { status: 500 },
    );
  }

  if (!reordered || reordered === 0) {
    return NextResponse.json({ error: "No matching sections found." }, { status: 404 });
  }

  return NextResponse.json({ reordered });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { syncProjectChromeNavFromPages } from "@/lib/create/site-chrome";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/:id/site-chrome/sync-nav
 *
 * Durably reconcile the site-chrome navigation with the current page list.
 * Called by the client whenever a page mutation returns navSyncStale:true.
 * Safe to retry — the operation is idempotent.
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
    action: "chrome.sync_nav",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const db = dbForProjectAccess(supabase, access.via);

  try {
    await syncProjectChromeNavFromPages(db as never, projectId);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Nav sync failed.",
        detail: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

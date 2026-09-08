import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
  type ProjectAccessRow,
  type ProjectAccessVia,
} from "@/lib/create/project-access";

/**
 * Shop admin APIs — owner, linked business team (shop roles), or support.
 */
export async function assertShopProjectAccess(
  userClient: SupabaseClient,
  opts: {
    userId: string;
    email?: string | null;
    projectId: string;
    select?: string;
    action?: string;
  },
): Promise<{ project: ProjectAccessRow; via: ProjectAccessVia; db: SupabaseClient } | null> {
  const access = await assertProjectEditorAccess(userClient, {
    ...opts,
    select: opts.select ?? "id, owner_id, title, subdomain, business_id",
    action: opts.action ?? "shop",
  });
  if (!access) return null;
  return {
    project: access.project,
    via: access.via,
    db: dbForProjectAccess(userClient, access.via),
  };
}

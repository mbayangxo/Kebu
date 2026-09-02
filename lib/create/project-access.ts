import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/opportunity/admin";
import { isSupportAdminEmail, logSupportAccess } from "@/lib/create/support-access";

export type ProjectAccessRow = {
  id: string;
  owner_id: string;
  title?: string | null;
  subdomain?: string | null;
  [key: string]: unknown;
};

/**
 * Owner always wins. Support admins (env allowlist) may load/edit via service role
 * because RLS only allows owner_id = auth.uid().
 */
export async function assertProjectEditorAccess(
  userClient: SupabaseClient,
  opts: {
    userId: string;
    email?: string | null;
    projectId: string;
    select?: string;
    action?: string;
  },
): Promise<{ project: ProjectAccessRow; via: "owner" | "support" } | null> {
  const select = opts.select ?? "id, owner_id, title, subdomain";
  const { data: owned } = await userClient
    .from("projects")
    .select(select)
    .eq("id", opts.projectId)
    .eq("owner_id", opts.userId)
    .maybeSingle();

  if (owned) {
    return { project: owned as unknown as ProjectAccessRow, via: "owner" };
  }

  if (!isSupportAdminEmail(opts.email)) {
    return null;
  }

  const service = createServiceClient();
  if (!service) return null;

  const { data: project } = await service
    .from("projects")
    .select(select)
    .eq("id", opts.projectId)
    .maybeSingle();

  if (!project) return null;

  const row = project as unknown as ProjectAccessRow;

  logSupportAccess({
    supportUserId: opts.userId,
    supportEmail: opts.email,
    projectId: opts.projectId,
    ownerId: row.owner_id,
    action: opts.action ?? "open",
  });

  return { project: row, via: "support" };
}

/** Client to use for subsequent reads/writes (service role when support). */
export function dbForProjectAccess(
  userClient: SupabaseClient,
  via: "owner" | "support",
): SupabaseClient {
  if (via === "owner") return userClient;
  const service = createServiceClient();
  return service ?? userClient;
}

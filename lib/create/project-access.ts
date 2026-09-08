import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/opportunity/admin";
import { isSupportAdminEmail, logSupportAccess } from "@/lib/create/support-access";

export type ProjectAccessRow = {
  id: string;
  owner_id: string;
  title?: string | null;
  subdomain?: string | null;
  business_id?: string | null;
  [key: string]: unknown;
};

export type ProjectAccessVia = "owner" | "support" | "team";

/** Roles that may operate a linked shop (not viewers / finance-only). */
export const SHOP_TEAM_ROLES = [
  "founder",
  "cofounder",
  "administrator",
  "store_manager",
  "manager",
  "creative",
] as const;

/**
 * Owner always wins. Active business members with shop roles may access via service role
 * (RLS is owner-scoped). Support admins (env allowlist) may load/edit the same way.
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
): Promise<{ project: ProjectAccessRow; via: ProjectAccessVia } | null> {
  const select = opts.select ?? "id, owner_id, title, subdomain, business_id";
  const { data: owned } = await userClient
    .from("projects")
    .select(select)
    .eq("id", opts.projectId)
    .eq("owner_id", opts.userId)
    .maybeSingle();

  if (owned) {
    return { project: owned as unknown as ProjectAccessRow, via: "owner" };
  }

  const service = createServiceClient();
  if (!service) {
    if (!isSupportAdminEmail(opts.email)) return null;
    return null;
  }

  const { data: project } = await service
    .from("projects")
    .select(select)
    .eq("id", opts.projectId)
    .maybeSingle();

  if (!project) return null;

  const row = project as unknown as ProjectAccessRow;
  const businessId =
    typeof row.business_id === "string" && row.business_id ? row.business_id : null;

  if (businessId) {
    const { data: member } = await service
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", opts.userId)
      .eq("status", "active")
      .maybeSingle();

    if (
      member &&
      (SHOP_TEAM_ROLES as readonly string[]).includes(String(member.role))
    ) {
      return { project: row, via: "team" };
    }
  }

  if (!isSupportAdminEmail(opts.email)) {
    return null;
  }

  logSupportAccess({
    supportUserId: opts.userId,
    supportEmail: opts.email,
    projectId: opts.projectId,
    ownerId: row.owner_id,
    action: opts.action ?? "open",
  });

  return { project: row, via: "support" };
}

/** Client to use for subsequent reads/writes (service role when support/team). */
export function dbForProjectAccess(
  userClient: SupabaseClient,
  via: ProjectAccessVia,
): SupabaseClient {
  if (via === "owner") return userClient;
  const service = createServiceClient();
  return service ?? userClient;
}

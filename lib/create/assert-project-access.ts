import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectAccess =
  | { ok: true; project: { id: string; business_id: string | null }; via: "owner" | "business_member" }
  | { ok: false; status: 404 };

const PRODUCT_ROLES = ["founder", "administrator"] as const;

/**
 * Asserts that userId may manage products for projectId.
 *
 * Allowed when:
 *   1. User is the project owner_id, OR
 *   2. The project has a business_id AND the user is an active founder/admin member of that business.
 *
 * Always returns 404 on denial to avoid leaking project existence.
 */
export async function assertProjectProductAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, business_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { ok: false, status: 404 };

  if (project.owner_id === userId) {
    return { ok: true, project: { id: project.id, business_id: project.business_id }, via: "owner" };
  }

  if (project.business_id) {
    const { data: membership } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", project.business_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membership && PRODUCT_ROLES.includes(membership.role as typeof PRODUCT_ROLES[number])) {
      return { ok: true, project: { id: project.id, business_id: project.business_id }, via: "business_member" };
    }
  }

  return { ok: false, status: 404 };
}

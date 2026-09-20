import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectRole = "owner" | "admin" | "editor" | "viewer";
export type ProjectCapability = "read" | "edit" | "manage_members" | "transfer_ownership";

const rank: Record<ProjectRole, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export function roleAllows(role: ProjectRole | null, capability: ProjectCapability): boolean {
  if (!role) return false;
  const required: Record<ProjectCapability, number> = {
    read: 1,
    edit: 2,
    manage_members: 3,
    transfer_ownership: 4,
  };
  return rank[role] >= required[capability];
}

export async function getProjectRole(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectRole | null> {
  const { data, error } = await supabase.rpc("project_access_role", {
    p_project_id: projectId,
  });
  if (error || !data || !["owner", "admin", "editor", "viewer"].includes(String(data))) return null;
  return data as ProjectRole;
}

export async function requireProjectCapability(
  supabase: SupabaseClient,
  projectId: string,
  capability: ProjectCapability,
): Promise<{ ok: true; role: ProjectRole } | { ok: false; status: 403 | 404 }> {
  const role = await getProjectRole(supabase, projectId);
  if (!role) return { ok: false, status: 404 };
  if (!roleAllows(role, capability)) return { ok: false, status: 403 };
  return { ok: true, role };
}

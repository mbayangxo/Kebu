import type { SupabaseClient } from "@supabase/supabase-js";

export type StudioDesignRole = "owner" | "editor" | "viewer";

export type StudioDesignAccess = {
  designId: string;
  role: StudioDesignRole;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  ownerId: string;
};

/** Pure flags from role — used by resolve + unit tests. */
export function studioAccessFromRole(
  designId: string,
  ownerId: string,
  role: StudioDesignRole,
): StudioDesignAccess {
  return {
    designId,
    role,
    canEdit: role === "owner" || role === "editor",
    canShare: role === "owner",
    canDelete: role === "owner",
    ownerId,
  };
}

/**
 * Resolve access to a Studio design for the current user.
 * Owner always wins; else active collaborator role.
 */
export async function resolveStudioDesignAccess(
  supabase: SupabaseClient,
  opts: { designId: string; userId: string },
): Promise<StudioDesignAccess | null> {
  const { data: design } = await supabase
    .from("create_designs")
    .select("id, owner_id")
    .eq("id", opts.designId)
    .maybeSingle();

  if (!design) return null;

  if (design.owner_id === opts.userId) {
    return studioAccessFromRole(design.id, design.owner_id as string, "owner");
  }

  const { data: collab } = await supabase
    .from("studio_design_collaborators")
    .select("role, status")
    .eq("design_id", opts.designId)
    .eq("user_id", opts.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!collab) return null;

  const role: StudioDesignRole = collab.role === "editor" ? "editor" : "viewer";
  return studioAccessFromRole(opts.designId, design.owner_id as string, role);
}

export function studioRoleLabel(role: StudioDesignRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Can edit";
    case "viewer":
      return "View only";
  }
}

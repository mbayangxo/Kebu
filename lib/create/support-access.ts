import { logCreate } from "@/lib/create/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "support" | "operations" | "admin" | "security";

export type StaffAuthorization = {
  role: StaffRole;
  source: "database" | "environment-bootstrap";
};

/**
 * Support admins = signed-in Kebu accounts listed in KEBU_SUPPORT_ADMIN_EMAILS.
 * They can open a user’s site builder when helping (audited). Never password sharing.
 */
export function parseSupportAdminEmails(raw = process.env.KEBU_SUPPORT_ADMIN_EMAILS): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSupportAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = parseSupportAdminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}

const SUPPORT_ROLES: readonly StaffRole[] = ["support", "admin"];

/** Database roles are authoritative; the env allowlist remains a bootstrap fallback. */
export async function resolveSupportAuthorization(
  service: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<StaffAuthorization | null> {
  const { data, error } = await service
    .from("platform_staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("active", true);
  if (!error && data?.length) {
    const role = data.map((row) => row.role as StaffRole).find((value) => SUPPORT_ROLES.includes(value));
    return role ? { role, source: "database" } : null;
  }
  if (error && !/does not exist|schema cache/i.test(error.message ?? "")) {
    throw new Error(`Could not verify staff role: ${error.message}`);
  }
  return isSupportAdminEmail(user.email)
    ? { role: "support", source: "environment-bootstrap" }
    : null;
}

export async function recordPrivilegedAudit(
  service: SupabaseClient,
  event: {
    actorUserId: string;
    actorRole: StaffRole;
    action: string;
    projectId?: string | null;
    supportSessionId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<boolean> {
  const { error } = await service.from("privileged_audit_events").insert({
    actor_user_id: event.actorUserId,
    actor_role: event.actorRole,
    action: event.action,
    project_id: event.projectId ?? null,
    support_session_id: event.supportSessionId ?? null,
    reason: event.reason ?? null,
    metadata: event.metadata ?? {},
  });
  return !error;
}

export function logSupportAccess(meta: {
  supportUserId: string;
  supportEmail?: string | null;
  projectId: string;
  action: string;
  ownerId?: string | null;
  reason?: string | null;
}) {
  logCreate("support.project_access", meta);
}

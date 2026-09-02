import { logCreate } from "@/lib/create/auth";

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

export function logSupportAccess(meta: {
  supportUserId: string;
  supportEmail?: string | null;
  projectId: string;
  action: string;
  ownerId?: string | null;
}) {
  logCreate("support.project_access", meta);
}

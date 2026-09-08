/** Shared invite role labels — safe for client + server. */

export const INVITE_ROLES = [
  "cofounder",
  "administrator",
  "manager",
  "creative",
  "store_manager",
  "finance_manager",
  "developer",
  "designer",
  "employee",
  "accountant",
  "legal_representative",
  "viewer",
] as const;

export type InviteRole = (typeof INVITE_ROLES)[number];

export function isInviteRole(v: string): v is InviteRole {
  return (INVITE_ROLES as readonly string[]).includes(v);
}

export function inviteRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    cofounder: "Cofounder",
    administrator: "Administrator",
    manager: "Manager (agency)",
    creative: "Creative",
    store_manager: "Store manager",
    finance_manager: "Finance manager",
    developer: "Developer",
    designer: "Designer",
    employee: "Employee",
    accountant: "Accountant",
    legal_representative: "Legal representative",
    viewer: "Viewer",
    founder: "Founder",
  };
  return labels[role] ?? role;
}

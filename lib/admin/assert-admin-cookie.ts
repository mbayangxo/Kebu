/** Team-only Kebu Record portal auth (cookie set by /api/admin/login). */
export function assertAdminCookie(req: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)alkebulan-admin=([^;]+)/);
  return match?.[1] === adminPassword;
}

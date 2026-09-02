import { NextRequest, NextResponse } from "next/server";
import { authRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
} from "@/lib/admin/admin-session";

export async function POST(req: NextRequest) {
  const limited = authRateLimit(req);
  if (limited) return limited;

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const { password, next } = await req.json().catch(() => ({ password: "", next: "/admin" }));
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !password || password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  let token: string;
  try {
    token = createAdminSessionToken();
  } catch {
    return NextResponse.json({ error: "Admin session not configured." }, { status: 503 });
  }

  const res = NextResponse.json({ success: true, next: next || "/admin" });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return res;
}

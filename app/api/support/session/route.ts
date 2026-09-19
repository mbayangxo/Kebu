import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { authRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { isSupportAdminEmail } from "@/lib/create/support-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import {
  SUPPORT_SESSION_COOKIE,
  createSupportSessionToken,
  supportSessionCookieOptions,
} from "@/lib/create/support-session";

const schema = z.object({
  projectId: z.string().uuid(),
  reason: z.string().trim().min(5).max(240),
});

export async function POST(req: Request) {
  const limited = authRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (!isSupportAdminEmail(user.email)) {
    return NextResponse.json({ error: "Support access denied." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Project and support reason are required." }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Support service unavailable." }, { status: 503 });
  const { data: project } = await service.from("projects").select("id, owner_id").eq("id", parsed.data.projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let token: string;
  try {
    token = createSupportSessionToken({
      userId: user.id,
      projectId: project.id,
      reason: parsed.data.reason,
    });
  } catch {
    return NextResponse.json({ error: "Support sessions are not configured." }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true, expiresInMinutes: 30 });
  res.cookies.set(SUPPORT_SESSION_COOKIE, token, supportSessionCookieOptions());
  logCreate("support.session_started", {
    supportUserId: user.id,
    supportEmail: user.email,
    projectId: project.id,
    ownerId: project.owner_id,
    reason: parsed.data.reason,
  });
  return res;
}

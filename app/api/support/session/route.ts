import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { authRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { recordPrivilegedAudit, resolveSupportAuthorization } from "@/lib/create/support-access";
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
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Project and support reason are required." }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Support service unavailable." }, { status: 503 });
  let authorization;
  try {
    authorization = await resolveSupportAuthorization(service, user);
  } catch {
    return NextResponse.json({ error: "Could not verify support authorization." }, { status: 503 });
  }
  if (!authorization) return NextResponse.json({ error: "Support access denied." }, { status: 403 });
  const { data: project } = await service.from("projects").select("id, owner_id").eq("id", parsed.data.projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: session, error: sessionError } = await service
    .from("support_access_sessions")
    .insert({
      staff_user_id: user.id,
      project_id: project.id,
      staff_role: authorization.role,
      reason: parsed.data.reason,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (sessionError || !session) {
    return NextResponse.json({ error: "Could not create support session." }, { status: 503 });
  }

  const audited = await recordPrivilegedAudit(service, {
    actorUserId: user.id,
    actorRole: authorization.role,
    action: "support.session_started",
    projectId: project.id,
    supportSessionId: session.id,
    reason: parsed.data.reason,
    metadata: { authorizationSource: authorization.source, ownerId: project.owner_id },
  });
  if (!audited) {
    await service.from("support_access_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: "Could not audit support session." }, { status: 503 });
  }

  let token: string;
  try {
    token = createSupportSessionToken({
      userId: user.id,
      projectId: project.id,
      sessionId: session.id,
      role: authorization.role,
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

export async function DELETE(req: Request) {
  const limited = authRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Support service unavailable." }, { status: 503 });

  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SUPPORT_SESSION_COOKIE}=([^;]+)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  const encoded = raw?.split(".")[0];
  let sessionId: string | null = null;
  if (encoded) {
    try {
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { sessionId?: string; userId?: string };
      if (payload.userId === auth.user.id && typeof payload.sessionId === "string") sessionId = payload.sessionId;
    } catch { /* invalid cookie is cleared below */ }
  }
  if (sessionId) {
    const { data: ended } = await service
      .from("support_access_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("staff_user_id", auth.user.id)
      .eq("status", "active")
      .select("id, project_id, staff_role, reason")
      .maybeSingle();
    if (ended) {
      await recordPrivilegedAudit(service, {
        actorUserId: auth.user.id,
        actorRole: ended.staff_role,
        action: "support.session_ended",
        projectId: ended.project_id,
        supportSessionId: ended.id,
        reason: ended.reason,
      });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPPORT_SESSION_COOKIE, "", { ...supportSessionCookieOptions(), maxAge: 0 });
  return res;
}

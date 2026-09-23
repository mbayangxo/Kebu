import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/opportunity/admin";
import { recordPrivilegedAudit, type StaffRole } from "@/lib/create/support-access";

export const SUPPORT_SESSION_COOKIE = "kebu-support-session";
const TTL_MS = 30 * 60 * 1000;

type SupportSessionPayload = {
  v: 2;
  sessionId: string;
  userId: string;
  projectId: string;
  role: StaffRole;
  reason: string;
  exp: number;
};

function secret(): string {
  const dedicated = process.env.SUPPORT_SESSION_SECRET?.trim();
  if (
    dedicated &&
    (process.env.NODE_ENV !== "production" ||
      (dedicated.length >= 32 && !/^(change_me|replace_|your_|example)/i.test(dedicated)))
  ) return dedicated;
  if (process.env.NODE_ENV !== "production") return process.env.ADMIN_SESSION_SECRET?.trim() || "dev-support-session-secret";
  return "";
}

function sign(encoded: string, key: string): string {
  return createHmac("sha256", key).update(encoded).digest("base64url");
}

export function createSupportSessionToken(input: {
  userId: string;
  projectId: string;
  sessionId: string;
  role: StaffRole;
  reason: string;
  now?: number;
}): string {
  const key = secret();
  if (!key) throw new Error("SUPPORT_SESSION_SECRET is required in production");
  const payload: SupportSessionPayload = {
    v: 2,
    sessionId: input.sessionId,
    userId: input.userId,
    projectId: input.projectId,
    role: input.role,
    reason: input.reason.trim().slice(0, 240),
    exp: (input.now ?? Date.now()) + TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, key)}`;
}

export function verifySupportSessionToken(
  token: string | null | undefined,
  expected: { userId: string; projectId: string },
  now = Date.now(),
): SupportSessionPayload | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expectedSig = sign(encoded, key);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSig);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SupportSessionPayload;
    if (
      payload.v !== 2 ||
      !payload.sessionId ||
      payload.userId !== expected.userId ||
      payload.projectId !== expected.projectId ||
      !payload.reason ||
      !Number.isFinite(payload.exp) ||
      payload.exp < now
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function currentSupportSession(expected: {
  userId: string;
  projectId: string;
}): Promise<SupportSessionPayload | null> {
  const store = await cookies();
  const payload = verifySupportSessionToken(store.get(SUPPORT_SESSION_COOKIE)?.value, expected);
  if (!payload) return null;
  const service = createServiceClient();
  if (!service) return null;
  const { data: session } = await service
    .from("support_access_sessions")
    .select("id, status, staff_user_id, project_id, staff_role, expires_at")
    .eq("id", payload.sessionId)
    .maybeSingle();
  if (
    !session || session.status !== "active" || session.staff_user_id !== payload.userId ||
    session.project_id !== payload.projectId || session.staff_role !== payload.role
  ) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await service.from("support_access_sessions").update({ status: "expired", ended_at: new Date().toISOString() }).eq("id", payload.sessionId).eq("status", "active");
    await recordPrivilegedAudit(service, {
      actorUserId: payload.userId,
      actorRole: payload.role,
      action: "support.session_expired",
      projectId: payload.projectId,
      supportSessionId: payload.sessionId,
      reason: payload.reason,
    });
    return null;
  }
  return payload;
}

export function supportSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(TTL_MS / 1000),
    path: "/",
  };
}

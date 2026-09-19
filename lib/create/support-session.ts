import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SUPPORT_SESSION_COOKIE = "kebu-support-session";
const TTL_MS = 30 * 60 * 1000;

type SupportSessionPayload = {
  v: 1;
  userId: string;
  projectId: string;
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
  reason: string;
  now?: number;
}): string {
  const key = secret();
  if (!key) throw new Error("SUPPORT_SESSION_SECRET is required in production");
  const payload: SupportSessionPayload = {
    v: 1,
    userId: input.userId,
    projectId: input.projectId,
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
      payload.v !== 1 ||
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
  return verifySupportSessionToken(store.get(SUPPORT_SESSION_COOKIE)?.value, expected);
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

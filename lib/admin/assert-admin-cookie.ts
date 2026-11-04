import { NextResponse } from "next/server";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-session";
import { recordSecurityEvent } from "@/lib/platform/security-events";

function requestPath(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "unknown";
  }
}

function rejectCrossOrigin(req: Request, originHost: string): NextResponse {
  recordSecurityEvent({
    eventType: "csrf_rejected",
    source: requestPath(req),
    detail: { method: req.method, originHost },
  });
  return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
}

/** Team-only Kebu Record portal auth (signed session cookie — not the raw password). */
export async function assertAdminCookie(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  return await verifyAdminSessionToken(raw);
}

/** Reject cross-site mutating requests (basic CSRF for cookie auth). */
export function assertSameOriginMutation(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = req.headers.get("origin");
  if (!origin) return null; // non-browser clients / same-origin form posts may omit

  const hostHeader = req.headers.get("host") ?? "";
  const requestHost = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  let originHost = "";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return rejectCrossOrigin(req, origin);
  }

  if (!requestHost || originHost !== requestHost) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const allowed = new URL(appUrl).hostname.toLowerCase();
        if (originHost === allowed) return null;
      } catch {
        /* ignore */
      }
    }
    return rejectCrossOrigin(req, originHost);
  }
  return null;
}

import { NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sitePasswordHash(subdomain: string, password: string): string {
  const salt = createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "kebu-site-pw-salt")
    .update(subdomain)
    .digest("hex")
    .slice(0, 32);
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

/** Signs a session token for `{subdomain}:{expiresAt}` using HMAC-SHA256. */
function signSessionToken(subdomain: string, expiresAt: number): string {
  const payload = `${subdomain}:${expiresAt}`;
  const sig = createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "kebu-site-pw-salt")
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
}

export function verifySessionToken(subdomain: string, token: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [sub, expiresStr, sig] = parts;
  if (sub !== subdomain) return false;
  const expiresAt = Number(expiresStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
  const expected = createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "kebu-site-pw-salt")
    .update(`${sub}:${expiresStr}`)
    .digest("hex");
  return sig === expected;
}

export async function POST(req: Request, { params }: Params) {
  const { subdomain } = await params;

  let password: string;
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password required." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, subdomain, site_password_enabled, site_password_hash")
    .eq("subdomain", subdomain)
    .eq("site_password_enabled", true)
    .maybeSingle();

  if (!project?.site_password_hash) {
    return NextResponse.json({ error: "No password set for this site." }, { status: 404 });
  }

  const hash = sitePasswordHash(subdomain, password);
  if (hash !== project.site_password_hash) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 h
  const token = signSessionToken(subdomain, expiresAt);
  const cookieName = `kebu_site_pw_${subdomain}`;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  return response;
}

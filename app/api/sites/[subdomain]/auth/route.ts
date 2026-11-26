import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { authRateLimit } from "@/lib/api-guard";
import {
  hashSitePassword,
  signSitePasswordSession,
  sitePasswordSecret,
  verifySitePassword,
  verifySitePasswordSession,
} from "@/lib/create/site-password";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function verifySessionToken(subdomain: string, token: string): boolean {
  const secret = sitePasswordSecret();
  return secret ? verifySitePasswordSession(subdomain, token, secret) : false;
}

export async function POST(req: Request, { params }: Params) {
  const limited = authRateLimit(req);
  if (limited) return limited;

  const { subdomain } = await params;
  const secret = sitePasswordSecret();
  if (!secret) {
    return NextResponse.json({ error: "Site password authentication is not configured." }, { status: 503 });
  }

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

  const verification = verifySitePassword({
    subdomain,
    password,
    storedHash: project.site_password_hash,
    secret,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  if (verification.needsUpgrade) {
    await supabase
      .from("projects")
      .update({ site_password_hash: hashSitePassword(subdomain, password, secret) })
      .eq("id", project.id);
  }

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 h
  const token = signSitePasswordSession(subdomain, expiresAt, secret);
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

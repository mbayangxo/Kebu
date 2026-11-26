import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { builderRateLimit } from "@/lib/api-guard";

export function marketplaceEnabled() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return process.env.KEBU_APP_MARKETPLACE_QA === "true" && process.env.VERCEL_ENV !== "production"
    && (/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || origin === "https://skqnxyaeimvbyrmdfzvk.supabase.co");
}
export const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control":"private, no-store" } });
export function mutationGuard(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const origin = req.headers.get("origin");
  try {
    const expected = new URL(req.url);
    const host = req.headers.get("host");
    if (host) expected.host = host;
    if (req.headers.get("sec-fetch-site") === "cross-site"
      || (origin && new URL(origin).origin !== expected.origin)) return reply({ error: "Forbidden origin." }, 403);
  } catch { return reply({ error: "Forbidden origin." }, 403); }
  if (!req.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "JSON required." }, 415);
  return null;
}
export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.length;
    if (length > 12000) { await reader.cancel(); return null; }
    chunks.push(next.value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
export async function account() {
  if (!marketplaceEnabled()) return { error: reply({ error: "App marketplace is not enabled here." }, 503) };
  const auth = await requireUser();
  if ("error" in auth) return auth;
  // Reject Supabase anonymous identities, too.
  const { data: { user } } = await auth.supabase.auth.getUser();
  return user && !user.is_anonymous ? auth : { error: reply({ error: "Sign in required." },401) };
}
export async function reviewer(req: Request) {
  if (!marketplaceEnabled()) return { error: reply({ error:"App marketplace is not enabled here." },503) };
  if (!await assertAdminCookie(req)) return { error: reply({ error:"Kebu Record sign-in required." },401) };
  return { db: createAdminClient() };
}

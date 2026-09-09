import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { issueCheckoutEmailOtp } from "@/lib/shop/checkout-email-otp";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  sessionKey: z.string().trim().min(8).max(80).optional(),
});

async function resolveLiveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return { error: "Service unavailable.", status: 503 as const };

  const { data: live } = await admin
    .from("deployments")
    .select("project_id, snapshot")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return { error: "Site is not live.", status: 404 as const };
  }

  const snap = live.snapshot as { seo?: { siteTitle?: string }; meta?: { title?: string } } | null;
  const shopName =
    snap?.seo?.siteTitle?.trim() ||
    snap?.meta?.title?.trim() ||
    subdomain;

  return { admin, projectId: live.project_id as string, shopName };
}

/** Send a 6-digit checkout confirmation code to the buyer email (Resend). */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const resolved = await resolveLiveProject(subdomain);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const result = await issueCheckoutEmailOtp(resolved.admin, {
    projectId: resolved.projectId,
    email: parsed.data.email,
    sessionKey: parsed.data.sessionKey,
    shopName: resolved.shopName,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({
    ok: true,
    email: result.email,
    expiresAt: result.expiresAt,
    message: `We sent a code to ${result.email}. Enter it below to continue.`,
  });
}

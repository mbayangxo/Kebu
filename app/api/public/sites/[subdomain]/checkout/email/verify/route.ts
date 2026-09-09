import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { verifyCheckoutEmailOtp } from "@/lib/shop/checkout-email-otp";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().trim().min(4).max(12),
  sessionKey: z.string().trim().min(8).max(80).optional(),
});

/** Verify checkout email code → short-lived proof token for place-order / cart checkout. */
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
    return NextResponse.json({ error: "Email and 6-digit code are required." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  const result = await verifyCheckoutEmailOtp(admin, {
    projectId: live.project_id,
    email: parsed.data.email,
    code: parsed.data.code,
    sessionKey: parsed.data.sessionKey,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({
    ok: true,
    email: result.email,
    emailVerificationToken: result.proofToken,
    expiresAt: result.expiresAt,
    message: "Email confirmed. You can place your order.",
  });
}

import { createServiceClient } from "@/lib/opportunity/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { acquireCreativeAsset, KEBU_CHECKOUT_METHODS } from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ method: z.enum(KEBU_CHECKOUT_METHODS).optional() });

/** Add a published creative asset to my library — free assets unlock immediately, priced ones start a real Kebu Checkout. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rawBody = await req.text();
  let bodyJson: unknown = {};
  try {
    bodyJson = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(bodyJson);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
  const method = parsed.data.method ?? "joko";

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const result = await acquireCreativeAsset(auth.supabase, { id: auth.user.id, email: auth.user.email }, id, appUrl, method, createServiceClient());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    alreadyOwned: result.alreadyOwned,
    item: result.item,
    paymentUrl: result.paymentUrl,
    priceLabel: result.priceLabel,
  });
}

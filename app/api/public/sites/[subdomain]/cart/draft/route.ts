import { NextResponse } from "next/server";
import { z } from "zod";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { upsertCartDraft } from "@/lib/shop/cart-order";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

const draftSchema = z.object({
  sessionKey: z.string().trim().min(8).max(80),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .max(24),
  customerEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().email().max(254).optional(),
  ),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z.string().trim().max(24).optional(),
  discountCode: z.string().trim().max(32).optional(),
});

/** Persist open cart for abandon recovery (service role). Does not create an order. */
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
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft." }, { status: 400 });
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

  const saved = await upsertCartDraft({
    admin,
    projectId: live.project_id,
    subdomain,
    sessionKey: parsed.data.sessionKey,
    items: parsed.data.items,
    customerEmail: parsed.data.customerEmail,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    discountCode: parsed.data.discountCode,
  });

  if (!saved.ok) {
    if (/does not exist|shop_cart_drafts/i.test(saved.error)) {
      return NextResponse.json(
        { error: "Cart drafts need migration 046. Apply APPLY_SHOP_ORDERS.sql." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not save cart draft." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

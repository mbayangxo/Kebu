import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import {
  deleteShippingOption,
  shippingOptionInputSchema,
  updateShippingOption,
} from "@/lib/shop/shipping-options";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; optionId: string }> };

/** Merchant: edit a shipping option's label/price/eta/active state. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, optionId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-shipping",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = shippingOptionInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shipping option.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateShippingOption(access.db, projectId, optionId, parsed.data);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 404 });
  return NextResponse.json({ option: updated.option });
}

/** Merchant: remove a shipping option. Past orders keep their own copied label/amount. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, optionId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-shipping",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const deleted = await deleteShippingOption(access.db, projectId, optionId);
  if (!deleted.ok) return NextResponse.json({ error: deleted.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

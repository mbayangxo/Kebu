import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import {
  createShippingOption,
  listShippingOptions,
  shippingOptionInputSchema,
} from "@/lib/shop/shipping-options";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list every shipping option on this project (active or not). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-shipping",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const options = await listShippingOptions(access.db, projectId);
  return NextResponse.json({ options });
}

/** Merchant: define a new named shipping option (e.g. "Pickup — free", "Dakar delivery"). */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

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
  const parsed = shippingOptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shipping option.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createShippingOption(access.db, projectId, parsed.data);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });
  return NextResponse.json({ option: created.option }, { status: 201 });
}

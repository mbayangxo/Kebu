import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createDemoShopOrder, type DemoOrderWhich } from "@/lib/shop/demo-orders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Merchant practice orders (1 then 2) so owners can see fulfill / customers UI.
 * Never paid. Never decrements stock.
 */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const whichRaw = Number(rec.which ?? 1);
  const which = (whichRaw === 2 ? 2 : 1) as DemoOrderWhich;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const result = await createDemoShopOrder(supabase, { projectId, which });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  logCreate("shop.demo_order", {
    userId: user.id,
    projectId,
    which,
    orderId: result.orderId,
    alreadyExists: result.alreadyExists ?? false,
  });

  return NextResponse.json({
    ok: true,
    which,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    alreadyExists: result.alreadyExists ?? false,
    hint: result.alreadyExists
      ? `Demo ${which} already exists — open Orders to practice fulfill.`
      : `Demo ${which} created — open Orders to fulfill with tracking (JOKO pay preference shown as unpaid).`,
  });
}

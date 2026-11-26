import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { markDeveloperPayoutPaid } from "@/lib/create/developer-payouts";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ note: z.string().trim().max(500).optional() });

/** Record that an admin actually sent the money outside the app (Wave/Orange Money/bank), by hand. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const { id } = await params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const parsed = bodySchema.safeParse(body);

  const result = await markDeveloperPayoutPaid(supabase, id, null, parsed.success ? parsed.data.note : undefined);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}

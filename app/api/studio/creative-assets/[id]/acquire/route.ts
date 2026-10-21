import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { acquireCreativeAsset } from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

/** Add a published creative asset to my library — free assets unlock immediately, priced ones start a real Joko checkout. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const result = await acquireCreativeAsset(auth.supabase, { id: auth.user.id, email: auth.user.email }, id, appUrl);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    alreadyOwned: result.alreadyOwned,
    item: result.item,
    paymentUrl: result.paymentUrl,
    priceLabel: result.priceLabel,
  });
}

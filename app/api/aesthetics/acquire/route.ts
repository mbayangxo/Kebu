import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  acquireCatalogAesthetic,
  acquireMarketplaceAesthetic,
} from "@/lib/create/aesthetics-marketplace";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog"),
    catalogSlug: z.string().trim().min(1).max(80),
  }),
  z.object({
    kind: z.literal("marketplace"),
    marketplaceId: z.string().uuid(),
  }),
]);

/** Buy or accept an aesthetic — lands in owned library (no re-upload). */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a catalog or marketplace aesthetic." }, { status: 400 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  const user = { id: auth.user.id, email: auth.user.email };

  const result =
    parsed.data.kind === "catalog"
      ? await acquireCatalogAesthetic(auth.supabase, user, parsed.data.catalogSlug, appUrl)
      : await acquireMarketplaceAesthetic(auth.supabase, user, parsed.data.marketplaceId, appUrl);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (result.paymentUrl) {
    return NextResponse.json({
      ok: true,
      needsPayment: true,
      paymentUrl: result.paymentUrl,
      priceLabel: result.priceLabel,
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyOwned: result.alreadyOwned ?? false,
    item: result.item
      ? {
          id: result.item.id,
          name: result.item.name,
          kind: result.item.kind,
        }
      : null,
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  kebuCatalogAestheticCards,
  listPublishedMarketplaceAesthetics,
  uploadMarketplaceAesthetic,
} from "@/lib/create/aesthetics-marketplace";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(40).optional(),
  priceCents: z.number().int().min(0).max(500_000).optional(),
  fileJson: z.unknown(),
  publish: z.boolean().optional(),
});

/** Store: Kebu catalog + published developer aesthetics. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const market = await listPublishedMarketplaceAesthetics(auth.supabase);
  const marketplace =
    market.ok
      ? market.items.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          description: i.description,
          category: i.category,
          priceCents: i.price_cents,
          developerName: i.developer_name ?? null,
          salesCount: i.sales_count,
          kind: "marketplace" as const,
        }))
      : [];

  return NextResponse.json({
    catalog: kebuCatalogAestheticCards(),
    marketplace,
    marketplaceError: market.ok ? null : market.error,
  });
}

/** Developer uploads an aesthetic to sell. */
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

  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and Kebu JSON file are required." }, { status: 400 });
  }

  const result = await uploadMarketplaceAesthetic(auth.supabase, auth.user.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    priceCents: parsed.data.priceCents,
    fileJson: parsed.data.fileJson,
    publish: parsed.data.publish,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    item: {
      id: result.item.id,
      slug: result.item.slug,
      name: result.item.name,
      status: result.item.status,
      priceCents: result.item.price_cents,
    },
  });
}

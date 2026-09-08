import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { listOwnedAesthetics, uploadOwnedAesthetic } from "@/lib/create/aesthetics-marketplace";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  fileJson: z.unknown(),
});

/** Purchased / uploaded aesthetics you own. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const result = await listOwnedAesthetics(auth.supabase, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items.map((i) => ({
      id: i.id,
      kind: i.kind,
      catalogSlug: i.catalog_slug,
      marketplaceId: i.marketplace_id,
      name: i.name,
      amountUsdCents: i.amount_usd_cents,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    })),
  });
}

/** Upload a personal aesthetic into your library (no sell). */
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
    return NextResponse.json({ error: "Name and Kebu JSON are required." }, { status: 400 });
  }

  const result = await uploadOwnedAesthetic(auth.supabase, auth.user.id, {
    name: parsed.data.name,
    fileJson: parsed.data.fileJson,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    item: {
      id: result.item.id,
      name: result.item.name,
      kind: result.item.kind,
    },
  });
}

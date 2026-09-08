import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

const addSchema = z.object({
  productId: z.string().uuid(),
});

async function liveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return { error: NextResponse.json({ error: "Service unavailable." }, { status: 503 }) };
  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();
  if (!live?.project_id) {
    return { error: NextResponse.json({ error: "Site is not live." }, { status: 404 }) };
  }
  return { admin, projectId: live.project_id as string };
}

/** List wishlist products for signed-in shopper on this store. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();

  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: rows, error } = await supabase
    .from("shop_wishlists")
    .select("product_id, created_at")
    .eq("user_id", user.id)
    .eq("project_id", live.projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Wishlist needs migration 049. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not load wishlist.",
        items: [],
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  const ids = (rows ?? []).map((r) => r.product_id as string);
  if (!ids.length) return NextResponse.json({ items: [] });

  const { data: products } = await live.admin
    .from("project_products")
    .select("id, name, price_label, image_url, is_active, upc, sku")
    .eq("project_id", live.projectId)
    .in("id", ids);

  const byId = new Map((products ?? []).map((p) => [p.id as string, p]));
  const items = ids
    .map((id) => {
      const p = byId.get(id);
      if (!p || p.is_active === false) return null;
      return {
        productId: id,
        name: p.name as string,
        priceLabel: (p.price_label as string) ?? "",
        imageUrl: (p.image_url as string) ?? "",
        upc: (p as { upc?: string | null }).upc ?? null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}

/** Add product to wishlist. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: product } = await live.admin
    .from("project_products")
    .select("id")
    .eq("id", parsed.data.productId)
    .eq("project_id", live.projectId)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not for sale on this site." }, { status: 404 });
  }

  const { error } = await supabase.from("shop_wishlists").upsert(
    {
      user_id: user.id,
      project_id: live.projectId,
      product_id: parsed.data.productId,
    },
    { onConflict: "user_id,project_id,product_id", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Wishlist needs migration 049. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not save wishlist.",
      },
      { status: 500 },
    );
  }

  logCreate("shop.wishlist_add", { userId: user.id, projectId: live.projectId, productId: parsed.data.productId });
  return NextResponse.json({ ok: true });
}

/** Remove product from wishlist. */
export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }

  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  await supabase
    .from("shop_wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", live.projectId)
    .eq("product_id", productId);

  return NextResponse.json({ ok: true });
}

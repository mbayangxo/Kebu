import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  COLLECTION_SELECT,
  collectionSchema,
  slugifyCollectionName,
} from "@/lib/shop/product-collections";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: collections, error } = await supabase
    .from("project_product_collections")
    .select(COLLECTION_SELECT)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message?.includes("does not exist") ? "Apply migration 064." : "Could not load collections." },
      { status: 500 },
    );
  }

  const ids = (collections ?? []).map((c) => c.id);
  let items: { collection_id: string; product_id: string; sort_order: number }[] = [];
  if (ids.length) {
    const { data: rows } = await supabase
      .from("project_collection_items")
      .select("collection_id, product_id, sort_order")
      .in("collection_id", ids)
      .order("sort_order", { ascending: true });
    items = rows ?? [];
  }

  const byCollection = new Map<string, string[]>();
  for (const row of items) {
    const list = byCollection.get(row.collection_id) ?? [];
    list.push(row.product_id);
    byCollection.set(row.collection_id, list);
  }

  return NextResponse.json({
    collections: (collections ?? []).map((c) => ({
      ...c,
      productIds: byCollection.get(c.id) ?? [],
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = collectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const slug = parsed.data.slug ?? slugifyCollectionName(parsed.data.name);
  if (!slug) {
    return NextResponse.json({ error: "Collection slug is required." }, { status: 400 });
  }

  const { data: last } = await supabase
    .from("project_product_collections")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: collection, error } = await supabase
    .from("project_product_collections")
    .insert({
      project_id: projectId,
      business_id: project.business_id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      image_url: parsed.data.imageUrl,
      sort_order: parsed.data.sortOrder ?? (last?.sort_order ?? 0) + 1,
      is_active: parsed.data.isActive ?? true,
    })
    .select(COLLECTION_SELECT)
    .single();

  if (error || !collection) {
    return NextResponse.json(
      {
        error: /duplicate|unique/i.test(error?.message ?? "")
          ? "That collection slug already exists."
          : "Could not create collection.",
      },
      { status: /duplicate|unique/i.test(error?.message ?? "") ? 409 : 500 },
    );
  }

  const productIds = parsed.data.productIds ?? [];
  if (productIds.length) {
    await supabase.from("project_collection_items").insert(
      productIds.map((productId, i) => ({
        collection_id: collection.id,
        product_id: productId,
        sort_order: i,
      })),
    );
  }

  return NextResponse.json({ collection: { ...collection, productIds } });
}

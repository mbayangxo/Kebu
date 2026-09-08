import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { COLLECTION_SELECT, collectionSchema } from "@/lib/shop/product-collections";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; collectionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, collectionId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
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

  const parsed = collectionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.imageUrl !== undefined) patch.image_url = parsed.data.imageUrl;
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const { data: collection, error } = await supabase
    .from("project_product_collections")
    .update(patch)
    .eq("id", collectionId)
    .eq("project_id", projectId)
    .select(COLLECTION_SELECT)
    .maybeSingle();

  if (error || !collection) {
    return NextResponse.json({ error: "Could not update collection." }, { status: 500 });
  }

  if (parsed.data.productIds) {
    await supabase.from("project_collection_items").delete().eq("collection_id", collectionId);
    if (parsed.data.productIds.length) {
      await supabase.from("project_collection_items").insert(
        parsed.data.productIds.map((productId, i) => ({
          collection_id: collectionId,
          product_id: productId,
          sort_order: i,
        })),
      );
    }
  }

  const { data: items } = await supabase
    .from("project_collection_items")
    .select("product_id")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    collection: { ...collection, productIds: (items ?? []).map((i) => i.product_id) },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, collectionId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  await supabase
    .from("project_product_collections")
    .delete()
    .eq("id", collectionId)
    .eq("project_id", projectId);

  return NextResponse.json({ ok: true });
}

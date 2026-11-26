import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { saveShopCollection } from "@/lib/shop/save-collection";
import { builderRateLimit } from "@/lib/api-guard";
import { collectionPatchSchema } from "@/lib/shop/product-collections";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; collectionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id: projectId, collectionId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = collectionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { productIds, ...fields } = parsed.data;
  return saveShopCollection(supabase, projectId, collectionId, fields, productIds);
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

  const { data: deleted, error } = await supabase
    .from("project_product_collections")
    .delete()
    .eq("id", collectionId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not remove collection." }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

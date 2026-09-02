import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { projectProductSchema } from "@/lib/create/project-products";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; productId: string }> };

const patchSchema = projectProductSchema.partial();

/** Update or remove a catalog product. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.priceLabel !== undefined) patch.price_label = parsed.data.priceLabel;
  if (parsed.data.imageUrl !== undefined) patch.image_url = parsed.data.imageUrl;
  if (parsed.data.whatsappOrderMessage !== undefined) {
    patch.whatsapp_order_message = parsed.data.whatsappOrderMessage;
  }
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const { data: product, error } = await supabase
    .from("project_products")
    .update(patch)
    .eq("id", productId)
    .eq("project_id", projectId)
    .select(
      "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !product) {
    return NextResponse.json({ error: "Could not update product." }, { status: 500 });
  }

  await recalculateReadinessForProject(supabase, projectId);
  return NextResponse.json({ product });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("project_products")
    .delete()
    .eq("id", productId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: "Could not delete product." }, { status: 500 });
  }

  await recalculateReadinessForProject(supabase, projectId);
  logCreate("products.deleted", { userId: user.id, projectId, productId });
  return NextResponse.json({ ok: true });
}

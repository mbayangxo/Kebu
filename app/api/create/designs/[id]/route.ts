import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createDesignCanvasSchema, createDesignSchema } from "@/lib/create/create-designs";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: createDesignSchema.shape.title.optional(),
  canvas: createDesignCanvasSchema.partial().optional(),
  businessId: z.string().uuid().nullable().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: design, error } = await supabase
    .from("create_designs")
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  return NextResponse.json({ design });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("create_designs")
    .select("id, canvas, business_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title) patch.title = parsed.data.title;
  if (parsed.data.businessId !== undefined) patch.business_id = parsed.data.businessId;
  if (parsed.data.canvas) {
    patch.canvas = { ...(existing.canvas as object), ...parsed.data.canvas };
  }

  const { data: design, error } = await supabase
    .from("create_designs")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .single();

  if (error || !design) {
    return NextResponse.json({ error: "Could not save design." }, { status: 500 });
  }

  const businessId = (parsed.data.businessId ?? existing.business_id) as string | null;
  await recalculateReadinessForBusiness(supabase, businessId);
  return NextResponse.json({ design });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: existing } = await supabase
    .from("create_designs")
    .select("business_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  await supabase.from("create_designs").delete().eq("id", id).eq("owner_id", user.id);
  await recalculateReadinessForBusiness(supabase, existing.business_id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; discountId: string }> };

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  percentOff: z.number().int().min(1).max(90).optional(),
});

/** Update or deactivate a discount code. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, discountId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
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

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
  if (parsed.data.maxUses !== undefined) patch.max_uses = parsed.data.maxUses;
  if (parsed.data.note !== undefined) patch.note = parsed.data.note;
  if (parsed.data.campaignId !== undefined) patch.campaign_id = parsed.data.campaignId;
  if (parsed.data.percentOff !== undefined) patch.percent_off = parsed.data.percentOff;

  const { data, error } = await supabase
    .from("shop_discount_codes")
    .update(patch)
    .eq("id", discountId)
    .eq("project_id", projectId)
    .select(
      "id, project_id, code, percent_off, is_active, max_uses, uses_count, campaign_id, note, starts_at, ends_at, created_at",
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update discount." }, { status: 500 });
  }

  return NextResponse.json({ discount: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, discountId } = await params;

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
    .from("shop_discount_codes")
    .delete()
    .eq("id", discountId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: "Could not delete discount." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { mapGiftCard, type GiftCardRow } from "@/lib/shop/gift-cards";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; cardId: string }> };

const patchSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

/** Merchant disable / re-enable a gift card (C6). */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, cardId } = await params;

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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("shop_gift_cards")
    .select("*")
    .eq("id", cardId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Gift card not found." }, { status: 404 });
  if (existing.status === "depleted") {
    return NextResponse.json({ error: "Depleted cards cannot be re-enabled." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shop_gift_cards")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update gift card." }, { status: 500 });
  }

  return NextResponse.json({ giftCard: mapGiftCard(data as GiftCardRow) });
}

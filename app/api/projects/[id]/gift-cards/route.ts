import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  generateGiftCardCode,
  giftCardInputSchema,
  mapGiftCard,
  type GiftCardRow,
} from "@/lib/shop/gift-cards";

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

  const { data, error } = await supabase
    .from("shop_gift_cards")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Apply migration 066_remaining_slices.sql." }, { status: 500 });
  }

  return NextResponse.json({ giftCards: ((data ?? []) as GiftCardRow[]).map(mapGiftCard) });
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

  const parsed = giftCardInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const code = generateGiftCardCode();
  const { data, error } = await supabase
    .from("shop_gift_cards")
    .insert({
      project_id: projectId,
      code,
      initial_balance_xof: parsed.data.initialBalanceXof,
      balance_xof: parsed.data.initialBalanceXof,
      recipient_email: parsed.data.recipientEmail ?? null,
      note: parsed.data.note,
      expires_at: parsed.data.expiresAt ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create gift card." }, { status: 500 });
  }

  return NextResponse.json({ giftCard: mapGiftCard(data as GiftCardRow) }, { status: 201 });
}

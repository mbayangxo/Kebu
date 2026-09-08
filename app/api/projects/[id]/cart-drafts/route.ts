import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  listAbandonedCartDrafts,
  markCartDraftRecovered,
  recoveryWhatsAppHref,
  recoveryWhatsAppMessage,
  sendCartRecoveryEmail,
  cartDraftItemCount,
} from "@/lib/shop/cart-drafts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list abandoned open carts (idle ≥ 30 min). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const listed = await listAbandonedCartDrafts(supabase, projectId, { minAgeMinutes: 30 });
  if (!listed.ok) {
    return NextResponse.json({ error: listed.error }, { status: 500 });
  }

  return NextResponse.json({
    drafts: listed.drafts.map((d) => ({
      ...d,
      itemCount: cartDraftItemCount(d.items),
    })),
    shopName: project.title ?? "Shop",
  });
}

const patchSchema = z.object({
  draftId: z.string().uuid(),
  action: z.enum(["mark_recovered", "send_recovery"]),
  discountCode: z.string().trim().max(32).optional(),
});

/** Mark recovered or send recovery email / return WhatsApp link. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: draft } = await supabase
    .from("shop_cart_drafts")
    .select(
      "id, subdomain, customer_email, customer_name, customer_phone, discount_code, status, items",
    )
    .eq("id", parsed.data.draftId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!draft || draft.status !== "open") {
    return NextResponse.json({ error: "Draft not found or already closed." }, { status: 404 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const siteUrl = `${appUrl}/sites/${draft.subdomain}`;
  const shopName = (project.title as string) || "Shop";
  const discountCode = parsed.data.discountCode ?? draft.discount_code;

  if (parsed.data.action === "mark_recovered") {
    const marked = await markCartDraftRecovered(supabase, projectId, draft.id);
    if (!marked.ok) return NextResponse.json({ error: marked.error }, { status: 500 });
    logCreate("shop.cart_draft_recovered", { projectId, draftId: draft.id });
    return NextResponse.json({ ok: true, status: "recovered" });
  }

  // send_recovery
  const message = recoveryWhatsAppMessage({
    shopName,
    siteUrl,
    discountCode,
    customerName: draft.customer_name,
  });
  const whatsappHref = draft.customer_phone
    ? recoveryWhatsAppHref(draft.customer_phone, message)
    : null;

  let emailSent = false;
  let emailReason: string | undefined;
  if (draft.customer_email) {
    const sent = await sendCartRecoveryEmail({
      to: draft.customer_email,
      shopName,
      siteUrl,
      discountCode,
    });
    emailSent = sent.sent;
    emailReason = sent.reason;
    if (sent.sent) {
      await markCartDraftRecovered(supabase, projectId, draft.id);
      logCreate("shop.cart_recovery_email", { projectId, draftId: draft.id });
    }
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    emailReason: emailSent ? undefined : emailReason ?? (!draft.customer_email ? "No email on draft." : undefined),
    whatsappHref,
    message,
    siteUrl,
    markedRecovered: emailSent,
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { fulfillPaidDigitalOrderDurable } from "@/lib/shop/digital-downloads";
import { verifyWaveWebhookSignature } from "@/lib/payments/wave-webhook";

export const dynamic="force-dynamic";
const identity=z.string().trim().min(1).max(255);
const completedCheckout=z.object({
  id:identity,type:z.literal("checkout.session.completed"),
  data:z.object({id:identity,client_reference:identity,transaction_id:identity,
    amount:z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger),
    currency:z.literal("XOF"),payment_status:z.literal("succeeded"),checkout_status:z.literal("complete")}),
});

/** Verified proof enters one service transaction, never the unverified fallback dispatcher. */
export async function POST(req:Request) {
  const secret=process.env.WAVE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({error:"Wave webhook verification is unavailable."},{status:503});
  const raw=await req.text();
  if (!verifyWaveWebhookSignature(raw,req.headers.get("Wave-Signature"),secret)) return NextResponse.json({error:"Invalid Wave signature."},{status:401});
  let payload:unknown;
  try {payload=JSON.parse(raw);} catch {return NextResponse.json({error:"Invalid JSON."},{status:400});}
  if (!payload || typeof payload!=="object" || Array.isArray(payload) || typeof (payload as {type?:unknown}).type!=="string") return NextResponse.json({error:"Invalid Wave event."},{status:400});
  const candidate=payload as {type:string;data?:{payment_status?:unknown;checkout_status?:unknown}};
  if (candidate.type!=="checkout.session.completed") return NextResponse.json({ok:true,ignored:true});
  if (candidate.data && typeof candidate.data==="object" && (
    typeof candidate.data.payment_status==="string" && candidate.data.payment_status!=="succeeded" ||
    typeof candidate.data.checkout_status==="string" && candidate.data.checkout_status!=="complete"
  )) return NextResponse.json({ok:true,ignored:true});
  const parsed=completedCheckout.safeParse(payload);
  if (!parsed.success) return NextResponse.json({error:"Incomplete Wave settlement proof."},{status:400});
  const admin=createServiceClient();
  if (!admin) return NextResponse.json({error:"Payment verification is unavailable."},{status:503});
  const proof=parsed.data;
  let response;
  try {
    response=await admin.rpc("complete_verified_wave_payment",{
      p_reference:proof.data.client_reference,p_checkout_id:proof.data.id,p_transaction_id:proof.data.transaction_id,
      p_event_id:proof.id,p_amount_xof:proof.data.amount,p_currency:proof.data.currency,
    });
  } catch {return NextResponse.json({error:"Payment verification must be retried."},{status:503});}
  const {data,error}=response;
  const receipt=Array.isArray(data)?data[0]:data;
  if (error || !receipt || !["shop_order","creative_asset_purchase","aesthetic_purchase"].includes(receipt.kind)) return NextResponse.json({error:"Payment could not be verified against its saved checkout. Please retry delivery."},{status:503});
  if (receipt.kind==="shop_order") {
    if (typeof receipt.order_id!=="string" || !receipt.order_id || typeof receipt.project_id!=="string" || !receipt.project_id) return NextResponse.json({error:"Invalid payment receipt."},{status:503});
    try {await fulfillPaidDigitalOrderDurable(admin,receipt.order_id);}
    catch {return NextResponse.json({error:"Payment recorded; delivery must be retried."},{status:503});}
    return NextResponse.json({ok:true,kind:receipt.kind,orderId:receipt.order_id});
  }
  if (typeof receipt.library_id!=="string" || !receipt.library_id) return NextResponse.json({error:"Invalid payment receipt."},{status:503});
  return NextResponse.json({ok:true,kind:receipt.kind});
}

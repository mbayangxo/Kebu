import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
import { verifyWaveSignature,retrieveWaveSession,waveSessionMatches } from "@/lib/payments/wave-verification";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest) {
  const raw=await req.text();
  if(!verifyWaveSignature(raw,req.headers.get("wave-signature"))) return NextResponse.json({error:"Invalid Wave signature."},{status:401});
  let event:{type?:string;data?:{id?:string}};
  try{event=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid JSON."},{status:400});}
  if(event.type!=="checkout.session.completed") return NextResponse.json({ok:true,ignored:true});
  if(!event.data?.id) return NextResponse.json({error:"Missing checkout session."},{status:400});
  const admin=createServiceClient();if(!admin) return NextResponse.json({error:"Service unavailable."},{status:503});
  const {data:order,error}=await admin.from("shop_orders").select("id,provider_reference,provider_payment_id,amount_xof")
    .eq("payment_provider","wave").eq("provider_payment_id",event.data.id).maybeSingle();
  if(error||!order) return NextResponse.json({error:"Wave checkout needs reconciliation."},{status:409});
  const session=await retrieveWaveSession(event.data.id);
  if(!session||!waveSessionMatches(session,{id:event.data.id,reference:order.provider_reference,amountXof:order.amount_xof})
    ||session.checkout_status!=="complete"||session.payment_status!=="succeeded") {
    return NextResponse.json({error:"Wave payment amount or status is not verified."},{status:409});
  }
  const paid=await markShopOrderPaidByProviderRef(admin,{reference:order.provider_reference,paymentId:event.data.id,provider:"wave"});
  if(!paid.ok) return NextResponse.json({error:paid.error},{status:409});
  return NextResponse.json({ok:true,kind:"shop_order",orderId:paid.orderId});
}

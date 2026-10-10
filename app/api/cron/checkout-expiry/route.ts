import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { requireCronSecret } from "@/lib/api-guard";
import { waveConfigured } from "@/lib/payments/wave-adapter";
import { reconcileExpiringWaveOrder,type ExpiringWaveOrder } from "@/lib/shop/checkout-expiry";
export const dynamic="force-dynamic";
export const maxDuration=120;
export async function GET(req:NextRequest) {
  const denied = requireCronSecret(req, { required: true });
  if (denied) return denied;
  const admin=createServiceClient();
  if(!admin||!waveConfigured()) return NextResponse.json({error:"Checkout expiry is not configured."},{status:503});
  const {data,error}=await admin.from("shop_orders")
    .select("id,project_id,provider_reference,provider_payment_id,amount_xof,checkout_expires_at")
    .eq("payment_provider","wave").eq("payment_status","awaiting_payment")
    .lte("checkout_expires_at",new Date().toISOString()).order("checkout_expires_at").limit(5);
  if(error) return NextResponse.json({error:"Could not inspect checkout expiry."},{status:503});
  const result={paid:0,expired:0,held:0};
  for(const order of (data??[]) as ExpiringWaveOrder[]) result[await reconcileExpiringWaveOrder(admin,order)]++;
  return NextResponse.json({ok:result.held===0,...result},{status:result.held?503:200});
}

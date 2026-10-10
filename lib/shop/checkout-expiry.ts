import type { SupabaseClient } from "@supabase/supabase-js";
import { retrieveWaveSession, waveSessionMatches } from "@/lib/payments/wave-verification";
import { markVerifiedShopPayment } from "@/lib/shop/checkout-persistence";

export type ExpiringWaveOrder = {id:string;project_id:string;provider_reference:string;provider_payment_id:string;amount_xof:number;checkout_expires_at:string};
export async function reconcileExpiringWaveOrder(admin:SupabaseClient,order:ExpiringWaveOrder):Promise<"paid"|"expired"|"held"> {
  const expiry=Date.parse(order.checkout_expires_at);
  if(!Number.isFinite(expiry)||expiry>Date.now()) return "held";
  const session=await retrieveWaveSession(order.provider_payment_id);
  if(!session||!waveSessionMatches(session,{id:order.provider_payment_id,reference:order.provider_reference,amountXof:order.amount_xof})) return "held";
  if(session.checkout_status==="complete"&&session.payment_status==="succeeded") {
    const paid=await markVerifiedShopPayment(admin,{reference:order.provider_reference,provider:"wave",paymentId:order.provider_payment_id});
    return paid.ok?"paid":"held";
  }
  // A local timestamp, provider 404, or processing payment cannot release stock.
  if(session.checkout_status!=="expired"||session.payment_status!=="cancelled"
    || !Number.isFinite(Date.parse(session.when_expires)) || Date.parse(session.when_expires)>Date.now()) return "held";
  const {data,error}=await admin.rpc("expire_verified_wave_checkout",{
    p_order_id:order.id,p_project_id:order.project_id,p_reference:order.provider_reference,p_payment_id:order.provider_payment_id,
  });
  return !error&&data===true?"expired":"held";
}

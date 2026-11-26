import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveWaveCheckoutQuote(admin:SupabaseClient, input:{
  kind:"shop_order"|"creative_asset_purchase"|"aesthetic_purchase"; purchaseId:string; reference:string; checkoutId:string;
  sourceAmountMinor:number; sourceCurrency:"XOF"|"USD"; settlement?:{amountMinor:number;currency:"XOF"};
}):Promise<{ok:true}|{ok:false;error:string}> {
  if (!input.checkoutId || !input.settlement || !Number.isSafeInteger(input.settlement.amountMinor) || input.settlement.amountMinor<=0 || input.settlement.currency!=="XOF") return {ok:false,error:"Wave did not provide a verifiable checkout quote."};
  let response;
  try { response=await admin.rpc("record_wave_checkout_quote",{
    p_kind:input.kind,p_purchase_id:input.purchaseId,p_reference:input.reference,p_checkout_id:input.checkoutId,
    p_source_amount_minor:input.sourceAmountMinor,p_source_currency:input.sourceCurrency,
    p_charge_amount_minor:input.settlement.amountMinor,p_charge_currency:input.settlement.currency,
  }); } catch { return {ok:false,error:"Your checkout could not be saved securely. Please try again."}; }
  const {data,error}=response;
  const quote=Array.isArray(data)?data[0]:data;
  if (error || typeof quote?.quote_id!=="string" || !quote.quote_id) return {ok:false,error:"Your checkout could not be saved securely. Please try again."};
  return {ok:true};
}

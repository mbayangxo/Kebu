import type { SupabaseClient } from "@supabase/supabase-js";
export async function resolveTrustedStudioMedia(supabase:SupabaseClient,url:string,businessId:string|null,ownerId:string){
 let parsed:URL;try{parsed=new URL(url)}catch{return null}if(!["https:"].includes(parsed.protocol))return null;
 let q=supabase.from("studio_uploads").select("url,owner_id,business_id").eq("url",url);
 q=businessId?q.eq("business_id",businessId):q.is("business_id",null).eq("owner_id",ownerId);
 const {data}=await q.maybeSingle();return data?.url===url?url:null;
}

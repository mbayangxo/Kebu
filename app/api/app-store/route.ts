import { account, marketplaceEnabled, mutationGuard, readBody, reply } from "@/lib/marketplace/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appFields, idPattern } from "@/lib/marketplace/model";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!marketplaceEnabled()) return reply({error:"App marketplace is not enabled here."},503);
  const db=createAdminClient();
  const {data,error}=await db.from("developer_apps").select(appFields).eq("status","published").eq("pricing","free").order("updated_at",{ascending:false}).limit(100);
  if(error) return reply({error:"Could not load the app catalog."},503);
  const auth=await account();
  if("error" in auth) return auth.error.status===401 ? reply({apps:data,installs:[],signedIn:false}) : auth.error;
  const installs=await auth.supabase.from("developer_app_installs").select("app_id,app_name,revision,installed_at").eq("user_id",auth.user.id);
  if(installs.error) return reply({error:"Could not load My Apps."},503);
  // Withdrawn/suspended installs remain visible as unavailable so users can remove them.
  const missing=(installs.data??[]).filter(i=>!data.some(a=>a.id===i.app_id)).map(i=>i.app_id);
  const extra=missing.length ? await db.from("developer_apps").select(appFields).in("id",missing)
    .eq("status","published").eq("pricing","free") : {data:[],error:null};
  if(extra.error) return reply({error:"Could not load installed apps."},503);
  const available=[...data,...(extra.data??[])];
  const unavailable=(installs.data??[]).filter(i=>!available.some(a=>a.id===i.app_id))
    .map(i=>({id:i.app_id,name:i.app_name,revision:i.revision}));
  return reply({apps:available,unavailable,installs:installs.data,signedIn:true});
}
export async function POST(req: Request) {
  const blocked=mutationGuard(req); if(blocked) return blocked;
  const auth=await account(); if("error" in auth) return auth.error;
  const body=await readBody(req);
  if(!body || typeof body.id!=="string" || !idPattern.test(body.id)) return reply({error:"Invalid app."},400);
  if(body.action==="remove"){
    const {error}=await auth.supabase.from("developer_app_installs").delete().eq("user_id",auth.user.id).eq("app_id",body.id);
    return error ? reply({error:"Could not remove app."},503) : reply({removed:true});
  }
  if(body.action!=="add" || body.consent!=="launcher-only-v1" || !Number.isSafeInteger(body.revision)) {
    return reply({error:"Review the app information and confirm before adding."},400);
  }
  const {error}=await auth.supabase.rpc("marketplace_install_app",{p_id:body.id,p_revision:body.revision});
  return error ? reply({error:"The app changed or is no longer available. Refresh the store."},409) : reply({added:true});
}

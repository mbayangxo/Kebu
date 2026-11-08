import { reviewer, mutationGuard, readBody, reply } from "@/lib/marketplace/server";
import { appFields,idPattern,validAppUrl } from "@/lib/marketplace/model";
export const dynamic = "force-dynamic";

export async function GET(req: Request){
  const auth=await reviewer(req); if("error" in auth) return auth.error;
  const apps=await auth.db.from("developer_apps").select(appFields+",owner_id").in("status",["review","published","suspended"]).order("updated_at",{ascending:false}).limit(100);
  return apps.error ? reply({error:"Could not load app reviews."},503) : reply({apps:apps.data});
}
export async function POST(req: Request){
  const blocked=mutationGuard(req);if(blocked) return blocked;
  const auth=await reviewer(req);if("error" in auth)return auth.error;
  const body=await readBody(req);
  if(!body || typeof body.id!=="string" || !idPattern.test(body.id) || !Number.isSafeInteger(body.revision)
    || !["published","rejected","suspended"].includes(String(body.decision))
    || typeof body.note!=="string" || body.note.trim().length<5 || body.note.length>1000) return reply({error:"Choose a decision and provide a review note (5–1,000 characters)."},400);
  const app=await auth.db.from("developer_apps").select("launch_url,privacy_url,support_url").eq("id",body.id).maybeSingle();
  if(app.error || !app.data) return reply({error:"Could not load app."},503);
  if(body.decision==="published" && ![app.data.launch_url,app.data.privacy_url,app.data.support_url].every(url=>validAppUrl(url,req.url))) {
    return reply({error:"Only external HTTPS launch, privacy and support pages can be approved."},422);
  }
  const {error}=await auth.db.rpc("marketplace_review_app",{
    p_id:body.id,p_revision:body.revision,p_decision:body.decision,p_note:body.note.trim(),p_reviewer:"Kebu Record",
  });
  return error ? reply({error:"App changed or the decision could not be saved. Refresh before retrying."},409) : reply({reviewed:true});
}

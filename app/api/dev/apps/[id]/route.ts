import { account, mutationGuard, readBody, reply } from "@/lib/marketplace/server";
import { appFields, idPattern, listingInput } from "@/lib/marketplace/model";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id:string }> };

export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  if (!idPattern.test(id)) return reply({error:"App not found."},404);
  const auth = await account(); if ("error" in auth) return auth.error;
  const { data,error } = await auth.supabase.from("developer_apps").select(appFields)
    .eq("id",id).eq("owner_id",auth.user.id).maybeSingle();
  if (error) return reply({error:"Could not load app."},503);
  if (!data) return reply({error:"App not found."},404);
  const reviews = await auth.supabase.from("developer_app_reviews").select("id,revision,decision,note,created_at")
    .eq("app_id",id).order("created_at",{ascending:false}).limit(20);
  if (reviews.error) return reply({error:"Could not load review history."},503);
  return reply({ app:data, reviews:reviews.data });
}
export async function PATCH(req: Request, context: Context) {
  const blocked = mutationGuard(req); if (blocked) return blocked;
  const { id } = await context.params;
  if (!idPattern.test(id)) return reply({error:"App not found."},404);
  const auth = await account(); if ("error" in auth) return auth.error;
  const body = await readBody(req);
  if (!body || !Number.isSafeInteger(body.revision)) return reply({error:"Refresh the app before saving."},400);
  const current = await auth.supabase.from("developer_apps").select(appFields).eq("id",id).eq("owner_id",auth.user.id).maybeSingle();
  if (current.error) return reply({error:"Could not load app."},503);
  if (!current.data) return reply({error:"App not found."},404);
  if (current.data.revision !== body.revision || current.data.status !== body.expectedStatus) return reply({error:"App changed. Refresh before trying again."},409);
  let updates: Record<string,unknown>;
  if (body.action === "submit") {
    if (!["draft","rejected"].includes(current.data.status)) return reply({error:"Only drafts can be submitted."},409);
    if (current.data.pricing !== "free") return reply({error:"Paid-app checkout is not enabled. Keep this app in draft."},422);
    updates={status:"review"};
  } else if (body.action === "withdraw") {
    if (!["review","published"].includes(current.data.status)) return reply({error:"This app cannot be withdrawn."},409);
    updates={status:"draft"};
  } else {
    if (!["draft","rejected"].includes(current.data.status)) return reply({error:"Withdraw the app before editing."},409);
    const input=listingInput(body);
    if (!input) return reply({error:"Check your app details and HTTPS URLs."},400);
    updates={...input,status:"draft"};
  }
  const {data,error}=await auth.supabase.from("developer_apps").update(updates)
    .eq("id",id).eq("owner_id",auth.user.id).eq("revision",body.revision).eq("status",body.expectedStatus).select(appFields).maybeSingle();
  if (error) return reply({error:error.code==="23514"?"Provide a description and valid launch, privacy and support pages.":"Could not update app."},422);
  return data ? reply({app:data}) : reply({error:"App changed. Refresh before trying again."},409);
}

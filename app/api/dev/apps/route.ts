import { account, mutationGuard, readBody, reply } from "@/lib/marketplace/server";
import { appFields, listingInput } from "@/lib/marketplace/model";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await account();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("developer_apps").select(appFields)
    .eq("owner_id", auth.user.id).order("updated_at", { ascending:false });
  return error ? reply({ error:"Could not load your apps." },503) : reply({ apps:data });
}
export async function POST(req: Request) {
  const blocked = mutationGuard(req); if (blocked) return blocked;
  const auth = await account(); if ("error" in auth) return auth.error;
  const input = listingInput(await readBody(req));
  if (!input) return reply({ error:"Check the app name, category, price, description and HTTPS URLs." },400);
  const { data,error } = await auth.supabase.from("developer_apps")
    .insert({ ...input, owner_id:auth.user.id }).select(appFields).single();
  return error ? reply({ error:"Could not create your app." },503) : reply({ app:data },201);
}

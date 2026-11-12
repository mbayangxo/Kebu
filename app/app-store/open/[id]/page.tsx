import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { marketplaceEnabled } from "@/lib/marketplace/server";
import { validAppUrl,idPattern } from "@/lib/marketplace/model";

export default async function OpenApp({params}:{params:Promise<{id:string}>}){
  if(!marketplaceEnabled())notFound();
  const {id}=await params;
  if(!idPattern.test(id))notFound();
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user||user.is_anonymous)redirect("/login?next=/app-store");
  const install=await db.from("developer_app_installs").select("revision").eq("user_id",user.id).eq("app_id",id).maybeSingle();
  const app=await db.from("developer_apps").select("id,name,launch_url,status,pricing,revision").eq("id",id).maybeSingle();
  const failed=Boolean(install.error||app.error);
  const available=!failed&&install.data&&app.data?.status==="published"&&app.data.pricing==="free"
    &&install.data.revision===app.data.revision&&validAppUrl(app.data.launch_url,process.env.NEXT_PUBLIC_APP_URL);
  return <AppShell title="Open app"><main className="mx-auto max-w-2xl space-y-5 px-5 py-10">
    <Link className="text-sm underline" href="/app-store">← My Apps</Link>
    <h1 className="text-4xl" style={{fontFamily:"var(--font-fraunces)"}}>{available?app.data?.name:"App unavailable"}</h1>
    {available?<><p>This app opens in a separate tab. It does not receive your KEBU login or account data.</p>
      <p className="break-all rounded-xl border bg-white p-4 text-sm">{app.data?.launch_url}</p>
      <a className="inline-flex min-h-11 items-center rounded-full bg-[#ff5500] px-5 text-sm font-bold text-black" href={app.data?.launch_url??undefined} target="_blank" rel="noopener noreferrer">Launch {app.data?.name} ↗</a>
    </>:<p role="status">{failed?"Could not check this app. Please try again.":"Add the current approved version from the App Store before opening. Withdrawn and suspended apps cannot be opened from KEBU."}</p>}
  </main></AppShell>;
}

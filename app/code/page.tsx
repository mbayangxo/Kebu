import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CodeWorkspace from "./workspace";

export const metadata = {title:"Kebu Code"};
export const dynamic = "force-dynamic";

export default async function CodePage(){
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect("/login?next=/code");
  return <CodeWorkspace/>;
}

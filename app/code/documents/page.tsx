import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Documents from "./documents";

export const metadata = { title: "Documents · Kebu Code" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login?next=/code/documents");
  return <Documents />;
}

import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { LigueyProfilePanel } from "@/app/components/liguey/liguey-profile-panel";

export default async function LigueyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/liguey/profile");

  const { data: nodes } = await supabase
    .from("library_nodes")
    .select("id, title, kind")
    .eq("owner_id", user.id)
    .is("trashed_at", null)
    .in("kind", ["document", "sheet", "link"])
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <AppShell title="Liguey profile">
      <LigueyProfilePanel libraryNodes={nodes ?? []} />
    </AppShell>
  );
}

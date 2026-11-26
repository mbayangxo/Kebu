import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { LigueyDiscoverClient } from "@/app/components/liguey/liguey-discover-client";

export default async function LigueyDiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/liguey/discover");

  return (
    <AppShell title="Open work">
      <LigueyDiscoverClient />
    </AppShell>
  );
}

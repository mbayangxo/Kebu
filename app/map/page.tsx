import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { KebuMap } from "@/app/components/maps/kebu-map";

export default async function MapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/map");

  return (
    <AppShell title="Map">
      <div className="mx-auto h-[calc(100vh-56px)] max-w-[1450px] px-4 py-3 sm:px-6 lg:px-7">
        <KebuMap />
      </div>
    </AppShell>
  );
}

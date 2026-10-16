import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { LigueyHomeClient } from "@/app/components/liguey/liguey-home-client";

export default async function LigueyHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/liguey");

  const { data: profile } = await supabase
    .from("worker_profiles")
    .select("headline, bio, skills, is_discoverable")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasStartedProfile = Boolean(profile && (profile.headline || profile.bio || profile.skills?.length));

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["founder", "administrator", "store_manager"]);
  const managedBusinessIds = (memberships ?? []).map((membership) => membership.business_id);
  let managedBusinesses: { id: string; legal_name: string; trading_name: string | null }[] = [];
  if (managedBusinessIds.length) {
    const { data } = await supabase.from("businesses").select("id, legal_name, trading_name").in("id", managedBusinessIds);
    managedBusinesses = data ?? [];
  }

  const { data: myApplications } = await supabase
    .from("job_applications")
    .select("id")
    .eq("applicant_user_id", user.id)
    .limit(1);
  const hasApplications = Boolean(myApplications?.length);

  return (
    <AppShell title="Liguey">
      <LigueyHomeClient
        hasStartedProfile={hasStartedProfile}
        profileHeadline={profile?.headline ?? null}
        hasApplications={hasApplications}
        managedBusinesses={managedBusinesses}
      />
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { LigueyApplicationsPanel } from "@/app/components/liguey/liguey-applications-panel";

export default async function LigueyApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/liguey/applications");

  const { data: applications } = await supabase
    .from("job_applications")
    .select("id, listing_id, status, cover_note, created_at")
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = [...new Set((applications ?? []).map((application) => application.listing_id))];
  let listings: { id: string; title: string; status: string }[] = [];
  if (listingIds.length) {
    const { data } = await supabase.from("job_listings").select("id, title, status").in("id", listingIds);
    listings = data ?? [];
  }

  return (
    <AppShell title="Your applications">
      <LigueyApplicationsPanel initialApplications={applications ?? []} initialListings={listings} />
    </AppShell>
  );
}

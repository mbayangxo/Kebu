import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { LigueyEmployerPanel } from "@/app/components/liguey/liguey-employer-panel";

type Props = { params: Promise<{ id: string }> };

export default async function BusinessLigueyPage({ params }: Props) {
  const { id: businessId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/business/${businessId}/liguey`);

  const isManager = await assertEmployerManager(supabase, businessId, user.id);
  if (!isManager) redirect(`/business/${businessId}`);

  const { data: listings } = await supabase
    .from("job_listings")
    .select("id, public_id, title, description, requirements, employment_type, location_type, location, pay_label, photo_url, status")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <AppShell title="Liguey listings">
      <LigueyEmployerPanel businessId={businessId} initialListings={listings ?? []} />
    </AppShell>
  );
}

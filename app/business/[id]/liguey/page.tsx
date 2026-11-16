import Link from "next/link";
import { builtinAccess, ligueyEnabled } from "@/lib/live/app-access";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { LigueyEmployerPanel } from "@/app/components/liguey/liguey-employer-panel";

type Props = { params: Promise<{ id: string }> };

export default async function BusinessLigueyPage({ params }: Props) {
  const { id: businessId } = await params;
  if (!ligueyEnabled()) redirect("/app-store");
  const access = await builtinAccess("liguey");
  if (access.error)
    return <p role="alert">Could not check your added apps. Please retry.</p>;
  if (!access.installed) redirect("/app-store");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/business/${businessId}/liguey`);

  const isManager = await assertEmployerManager(supabase, businessId, user.id);
  if (!isManager) redirect(`/business/${businessId}`);

  const { data: listings, error: listingsError } = await supabase
    .from("job_listings")
    .select(
      "id, public_id, title, description, requirements, employment_type, location_type, location, pay_label, photo_url, status",
    )
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <AppShell title="Liguey listings">
      <Link
        className="m-4 inline-block underline"
        href={`/business/${businessId}/liguey/verification`}
      >
        Company and recruiter review
      </Link>
      <Link
        className="m-4 inline-block underline"
        href={`/liguey/interviews?businessId=${businessId}`}
      >
        Interviews and onboarding invitations
      </Link>
      {listingsError ? (
        <p role="alert">Could not load listings. Please reload.</p>
      ) : (
        <LigueyEmployerPanel
          businessId={businessId}
          initialListings={listings ?? []}
        />
      )}
    </AppShell>
  );
}

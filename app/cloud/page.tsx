import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { CloudDashboard } from "@/app/components/cloud/cloud-dashboard";

export const metadata: Metadata = {
  title: "Kebu Cloud — Storage & Static Hosting",
  description: "Real object storage and static site/SPA hosting, each on its own isolated subdomain.",
};

export default async function CloudPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cloud");

  return (
    <AppShell title="Kebu Cloud">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-7">
        <CloudDashboard />
      </div>
    </AppShell>
  );
}

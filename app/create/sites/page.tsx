import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { MySitesGrid } from "@/app/components/create/my-sites-grid";

export const dynamic = "force-dynamic";

export default async function MySitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="My sites">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted mb-4">Sign in to see every site you have built on Kebu.</p>
          <a href="/login?next=/create/sites" className="font-bold underline text-orange-600">
            Sign in
          </a>
        </div>
      </AppShell>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, subdomain, project_type, updated_at, published_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <AppShell title="My sites">
      <MySitesGrid projects={projects ?? []} />
    </AppShell>
  );
}

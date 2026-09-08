import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { MySitesWithPortfolio } from "@/app/components/create/my-sites-with-portfolio";
import type { MySitesFilter } from "@/app/components/create/my-sites-grid";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

export const dynamic = "force-dynamic";

function parseFilter(raw: string | undefined): MySitesFilter {
  if (raw === "live" || raw === "draft") return raw;
  return "all";
}

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function MySitesPage({ searchParams }: Props) {
  const { filter: filterParam } = await searchParams;
  const initialFilter = parseFilter(filterParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="My sites">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted mb-4">Sign in to see every site you have built on Kebu — drafts and live.</p>
          <a href={`/login?next=${MY_SITES_HREF}`} className="font-bold underline text-orange-600">
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
      <MySitesWithPortfolio initialProjects={projects ?? []} initialFilter={initialFilter} />
    </AppShell>
  );
}

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { MySitesGrid } from "@/app/components/create/my-sites-grid";
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeBusinessId = profile?.active_business_id ?? null;

  let projectsQuery = supabase
    .from("projects")
    .select("id, title, status, subdomain, project_type, updated_at, published_at")
    .order("updated_at", { ascending: false });

  projectsQuery = activeBusinessId
    ? projectsQuery.eq("business_id", activeBusinessId)
    : projectsQuery.eq("owner_id", user.id);

  const { data: projects } = await projectsQuery;

  return (
    <AppShell title="My Sites">
      <div className="px-5 pt-8 sm:px-8 lg:px-16">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-black/35">
              {activeBusinessId ? "Active business" : "Your sites"}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.04em]">My Sites</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/45">
              Real sites from your Kebu account. Open a site to enter its own world; shops stay optional.
            </p>
          </div>
          <a href="/create/new" className="rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[.1em] text-white">
            + Create site
          </a>
        </div>
      </div>
      <MySitesGrid projects={projects ?? []} initialFilter={initialFilter} />
    </AppShell>
  );
}

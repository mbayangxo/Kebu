import Link from "next/link";
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
          <Link href={`/login?next=${MY_SITES_HREF}`} className="font-bold underline text-orange-600">
            Sign in
          </Link>
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
      <div className="px-5 pt-5 sm:px-8 lg:px-10 xl:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "rgba(10,10,10,.08)" }}>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-black/35">
            {activeBusinessId ? "Sites · Active business" : "Sites"}
          </p>
          <div className="flex items-center gap-2">
            <Link href="/create/aesthetics" className="rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/55" style={{ borderColor: "rgba(10,10,10,.12)" }}>
              Templates
            </Link>
            <Link href="/create/new" className="rounded-full bg-black px-4 py-2 text-[9px] font-black uppercase tracking-[.1em] text-white">
              + Create site
            </Link>
          </div>
        </div>
      </div>
      <MySitesGrid projects={projects ?? []} initialFilter={initialFilter} />
    </AppShell>
  );
}

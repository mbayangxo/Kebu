import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { MySitesGrid } from "@/app/components/create/my-sites-grid";
import type { MySitesFilter } from "@/app/components/create/my-sites-grid";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { KEBU } from "@/lib/kebu-brand";

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

  const all = projects ?? [];
  const published = all.filter((p) => Boolean(p.published_at) || p.status === "published" || p.status === "live").length;
  const drafts = all.length - published;
  const domains = all.filter((p) => Boolean(p.subdomain?.trim())).length;
  const recent = all.filter((p) => Date.now() - new Date(p.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const stores = all.filter((p) => String(p.project_type || "").toLowerCase().includes("shop") || String(p.project_type || "").toLowerCase().includes("store")).length;
  const stats = [
    ["Total sites", String(all.length), "◫"],
    ["Published", String(published), "◉"],
    ["Drafts", String(drafts), "▣"],
    ["Updated this week", String(recent), "▥"],
    ["Connected domains", String(domains), "↗"],
    ["Stores", String(stores), "□"],
  ] as const;

  return (
    <AppShell title="My Sites">
      <div className="px-4 py-4 sm:px-6 lg:px-7">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[9px] text-black/35">Business Hub&nbsp; / &nbsp;<strong className="text-black/75">My Sites</strong></p>
                <h1 className="mt-2 text-[34px] leading-none tracking-[-.045em]" style={{ fontFamily: "var(--font-fraunces)" }}>My Sites</h1>
                <p className="mt-1 text-[11px] text-black/42">Design, publish, and manage every site in one place.</p>
              </div>
              <Link href="/create/new" className="rounded-full bg-black px-5 py-2.5 text-[10px] font-semibold text-white">+ Create site</Link>
            </div>

            <div className="mt-5 grid overflow-hidden rounded-[14px] border bg-white sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" style={{ borderColor: KEBU.border }}>
              {stats.map(([label, value, icon]) => (
                <div key={label} className="min-h-[112px] border-b p-3.5 sm:border-r lg:border-b-0" style={{ borderColor: KEBU.border }}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF3EB] text-[12px]" style={{ color: KEBU.orange }}>{icon}</span>
                  <p className="mt-3 text-[22px] leading-none" style={{ fontFamily: "var(--font-fraunces)" }}>{value}</p>
                  <p className="mt-1 text-[9px] text-black/42">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <MySitesGrid projects={all} initialFilter={initialFilter} />
            </div>
          </section>

          <aside className="space-y-3">
            <div className="overflow-hidden rounded-[14px] border bg-[#FFF7F1] p-4" style={{ borderColor: KEBU.border }}>
              <p className="text-[22px] leading-[1.05] tracking-[-.035em]" style={{ fontFamily: "var(--font-fraunces)" }}>“More sites.<br />Greater impact.”</p>
              <div className="mt-4 h-10 rounded-[10px]" style={{ background: "linear-gradient(135deg,#ff6a00,#ff1f1f 45%,#250a05)" }} />
            </div>

            <div className="rounded-[14px] border bg-white p-3.5" style={{ borderColor: KEBU.border }}>
              <p className="mb-1 text-[11px] font-semibold">Quick actions</p>
              {[
                ["/create/new", "Create a new site", "Start with a template or blank site"],
                ["/create/domains", "Connect a domain", "Use your own domain name"],
                ["/create/aesthetics", "Browse templates", "Explore premium designs"],
                ["/shop", "Set up an online store", "Sell products and services"],
                ["/help", "Get help with your site", "Guides, tutorials and support"],
              ].map(([href, title, detail]) => (
                <Link key={href} href={href} className="flex items-center gap-3 border-t py-3 first:border-t-0" style={{ borderColor: KEBU.border }}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E8] text-[11px]" style={{ color: KEBU.orange }}>✦</span>
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold">{title}</span><span className="block text-[8px] text-black/35">{detail}</span></span>
                  <span className="text-black/25">›</span>
                </Link>
              ))}
            </div>

            <div className="rounded-[14px] border bg-white p-3.5" style={{ borderColor: KEBU.border }}>
              <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Recent activity</p><span className="text-[8px] text-black/35">Latest</span></div>
              {all.slice(0, 4).map((p) => (
                <Link key={p.id} href={MY_SITES_HREF + "/" + p.id} className="flex items-center gap-2 border-t py-3" style={{ borderColor: KEBU.border }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">{p.title.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-semibold">{p.title}</span><span className="block text-[8px] text-black/35">Updated {new Date(p.updated_at).toLocaleDateString()}</span></span>
                </Link>
              ))}
              {!all.length ? <p className="py-4 text-[9px] text-black/35">No site activity yet.</p> : null}
            </div>

            <div className="overflow-hidden rounded-[14px] bg-black p-4 text-white">
              <p className="text-[22px] leading-[1.05]" style={{ fontFamily: "var(--font-fraunces)" }}>Stunning sites<br />for bigger ideas.</p>
              <p className="mt-2 text-[9px] leading-relaxed text-white/45">Beautiful templates. Powerful tools. Built for your next chapter.</p>
              <Link href="/create/aesthetics" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-[9px] font-semibold text-black">Explore templates →</Link>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { MySitesWithPortfolio } from "@/app/components/create/my-sites-with-portfolio";
import type { MySitesFilter } from "@/app/components/create/my-sites-grid";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { KEBU } from "@/lib/kebu-brand";

export const dynamic = "force-dynamic";

function parseFilter(raw: string | undefined): MySitesFilter {
  if (raw === "live" || raw === "draft") return raw;
  return "all";
}

type Props = { searchParams: Promise<{ filter?: string; category?: string }> };

const TEMPLATE_CATS = ["All", "Landing Pages", "Portfolios", "Stores", "Brands", "Events", "Blog", "AI Builder"];

const TEMPLATE_TILES = [
  { label: "Agency", tag: "Business", accent: "#FF5500", bg: "#1a0800", cats: ["All", "Brands", "Landing Pages"] },
  { label: "Portfolio", tag: "Creative", accent: "#6C63FF", bg: "#0d0b1a", cats: ["All", "Portfolios"] },
  { label: "Store", tag: "Commerce", accent: "#0E9F6E", bg: "#071a10", cats: ["All", "Stores"] },
  { label: "Blog", tag: "Content", accent: "#0EA5E9", bg: "#071018", cats: ["All", "Blog"] },
  { label: "Event", tag: "Marketing", accent: "#F4B400", bg: "#181300", cats: ["All", "Events", "Landing Pages"] },
  { label: "Startup", tag: "SaaS", accent: "#FF1F1F", bg: "#1a0707", cats: ["All", "Landing Pages", "Brands"] },
  { label: "Restaurant", tag: "Local", accent: "#A15CFF", bg: "#130a1a", cats: ["All", "Stores"] },
  { label: "Personal", tag: "Minimal", accent: "#333333", bg: "#101010", cats: ["All", "Portfolios", "Brands"] },
];

const TOOLS = [
  { label: "AI Generate", href: "/create/sites?tab=ai" },
  { label: "Brand Kit", href: "/studio/brand" },
  { label: "Custom Domain", href: "/create/domains" },
  { label: "Ecommerce", href: "/shop" },
  { label: "Analytics", href: "/business" },
];

const border = KEBU.borders.default;

function parseCategory(raw: string | undefined): string {
  return TEMPLATE_CATS.includes(raw ?? "") ? (raw as string) : "All";
}

export default async function MySitesPage({ searchParams }: Props) {
  const { filter: filterParam, category: categoryParam } = await searchParams;
  const initialFilter = parseFilter(filterParam);
  const activeCategory = parseCategory(categoryParam);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="Sites">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="mb-4 text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>Sign in to see every site you have built on Kebu — drafts and live.</p>
          <a href={`/login?next=${MY_SITES_HREF}`} className="font-bold underline" style={{ color: KEBU.orange }}>Sign in</a>
        </div>
      </AppShell>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, subdomain, project_type, updated_at, published_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const allProjects = projects ?? [];

  return (
    <AppShell title="Sites">
      <div className="grid min-h-full xl:grid-cols-[minmax(0,1fr)_300px]">

        {/* Main content column */}
        <div className="overflow-x-hidden border-r" style={{ borderColor: border }}>

          {/* Hero */}
          <section className="border-b px-6 py-12 sm:px-8" style={{ borderColor: border }}>
            <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: KEBU.orange }}>Kebu Sites</p>
            <h1 className="mt-3 max-w-2xl text-[clamp(2.5rem,6vw,5rem)] font-black leading-[.88] tracking-[-.06em]" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              Build without{" "}
              <em className="font-normal not-italic" style={{ color: KEBU.orange }}>limits.</em>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.5)" }}>
              Create stunning websites, portfolios, and online stores. Launch in minutes with professional templates and AI.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/create/sites"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[11px] font-black uppercase tracking-[.12em] text-white transition hover:brightness-110"
                style={{ background: KEBU.orange }}>
                Create new site →
              </Link>
              <Link href="/create/sites?tab=ai"
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-[11px] font-black uppercase tracking-[.12em] transition hover:bg-black/[.04]"
                style={{ borderColor: border, color: "rgba(0,0,0,0.55)" }}>
                ✦ Start with AI
              </Link>
            </div>
          </section>

          {/* Template filter tabs */}
          <section className="border-b px-6 py-4 sm:px-8" style={{ borderColor: border }}>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATE_CATS.map((cat) => {
                const isActive = cat === activeCategory;
                const href = cat === "AI Builder"
                  ? "/create/sites?tab=ai"
                  : `/my-sites?category=${encodeURIComponent(cat)}${filterParam ? `&filter=${filterParam}` : ""}`;
                return (
                  <Link key={cat} href={href}
                    className="shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-colors"
                    style={{
                      background: isActive ? KEBU.orange : "transparent",
                      color: isActive ? "#fff" : "rgba(0,0,0,0.45)",
                      border: isActive ? "none" : `1px solid ${border}`,
                    }}>
                    {cat}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Template grid */}
          <section className="border-b px-6 py-8 sm:px-8" style={{ borderColor: border }}>
            {(() => {
              const visibleTiles = TEMPLATE_TILES.filter((t) => t.cats.includes(activeCategory));
              return visibleTiles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleTiles.map((tile) => (
                    <Link key={tile.label} href={`/create/sites?template=${encodeURIComponent(tile.label.toLowerCase())}`}
                      className="group overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderColor: border }}>
                      <div className="relative h-[140px] overflow-hidden" style={{ background: tile.bg }}>
                        <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(ellipse at 70% 30%,${tile.accent},transparent 55%)` }} />
                        <div className="absolute inset-4 rounded-xl border border-white/10 bg-white/5" />
                        <div className="absolute left-6 top-6">
                          <span className="block h-1 w-8 rounded-full" style={{ background: tile.accent + "aa" }} />
                          <span className="mt-1.5 block h-1 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                        </div>
                      </div>
                      <div className="px-4 py-3" style={{ background: "#fff" }}>
                        <p className="text-[12px] font-black" style={{ color: KEBU.black }}>{tile.label}</p>
                        <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{tile.tag}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: "rgba(0,0,0,0.4)" }}>
                  No templates in this category yet.
                </p>
              );
            })()}
          </section>

          {/* Existing projects — full interactive component */}
          {allProjects.length > 0 ? (
            <section className="px-6 py-8 sm:px-8">
              <div className="mb-5">
                <p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Your work</p>
                <h2 className="mt-1 text-xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>All your sites.</h2>
              </div>
              <MySitesWithPortfolio initialProjects={allProjects} initialFilter={initialFilter} />
            </section>
          ) : (
            <section className="px-6 py-12 sm:px-8 text-center">
              <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>No sites yet. Create your first one above.</p>
            </section>
          )}
        </div>

        {/* Right panel */}
        <aside className="hidden xl:flex xl:flex-col">

          {/* Your sites list */}
          <div className="border-b px-5 py-5" style={{ borderColor: border }}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.black }}>Your sites</p>
              <Link href="/my-sites" className="text-[10px] font-semibold" style={{ color: KEBU.orange }}>See all →</Link>
            </div>
            {allProjects.length === 0 ? (
              <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>No sites yet.</p>
            ) : (
              <div className="space-y-2">
                {allProjects.slice(0, 8).map((p) => (
                  <Link key={p.id} href={`/my-sites/${p.id}`} className="flex items-center gap-2.5 rounded-xl border p-2.5 transition hover:bg-black/[.02]" style={{ borderColor: border }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white" style={{ background: KEBU.orange }}>
                      {(p.title ?? "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-black" style={{ color: KEBU.black }}>{p.title || "Untitled site"}</p>
                      <p className="truncate text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>
                        {p.subdomain ? `${p.subdomain}.kebu.co` : "No domain"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase"
                      style={{
                        background: p.status === "live" ? "rgba(14,159,110,0.12)" : "rgba(0,0,0,0.07)",
                        color: p.status === "live" ? "#0E9F6E" : "rgba(0,0,0,0.4)",
                      }}>
                      {p.status ?? "draft"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Build with AI */}
          <div className="border-b px-5 py-5" style={{ borderColor: border }}>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.black }}>Build with AI</p>
            <p className="mb-3 text-[10px]" style={{ color: "rgba(0,0,0,0.45)" }}>Describe your site and AI will generate it.</p>
            <form method="GET" action="/create/sites">
              <input type="hidden" name="tab" value="ai" />
              <textarea
                name="prompt"
                placeholder="A portfolio for a fashion photographer..."
                className="w-full resize-none rounded-xl border px-3 py-2.5 text-[11px] outline-none focus:ring-2"
                rows={3}
                style={{ borderColor: border, background: "rgba(0,0,0,0.02)", color: KEBU.black }}
              />
              <button type="submit"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:brightness-110"
                style={{ background: KEBU.orange }}>
                ✦ Generate site
              </button>
            </form>
          </div>

          {/* Tools */}
          <div className="px-5 py-5">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.black }}>Tools</p>
            <div className="space-y-1">
              {TOOLS.map((tool) => (
                <Link key={tool.label} href={tool.href}
                  className="flex min-h-9 items-center rounded-xl px-3 text-[12px] font-medium transition-colors hover:bg-black/[.04]"
                  style={{ color: "rgba(0,0,0,0.55)" }}>
                  {tool.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

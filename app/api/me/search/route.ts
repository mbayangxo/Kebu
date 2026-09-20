import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
import type { SearchResult } from "@/lib/search/types";

export const dynamic = "force-dynamic";

const STATIC_PAGES: SearchResult[] = [
  { id: "p-dashboard",    label: "Your Kebu",          sublabel: "Home dashboard",               href: "/dashboard",             kind: "page" },
  { id: "p-my-sites",     label: "My Sites",           sublabel: "All your sites",               href: "/my-sites",              kind: "page" },
  { id: "p-create-new",   label: "New site",           sublabel: "Start building",               href: "/create/new",            kind: "page" },
  { id: "p-aesthetics",   label: "Aesthetic Gallery",  sublabel: "Browse site styles",           href: "/create/aesthetics",     kind: "page" },
  { id: "p-studio",       label: "Studio",             sublabel: "Design workspace",             href: "/studio",                kind: "page" },
  { id: "p-studio-new",   label: "New design",         sublabel: "Create in Studio",             href: "/studio/new",            kind: "page" },
  { id: "p-studio-ai",    label: "AI design",          sublabel: "Generate with AI",             href: "/studio/new?tab=ai",     kind: "page" },
  { id: "p-brand",        label: "Brand DNA",          sublabel: "Colors, voice, logo",          href: "/studio/brand",          kind: "page" },
  { id: "p-campaigns",    label: "Campaigns",          sublabel: "Brief → design sets",          href: "/studio/campaigns",      kind: "page" },
  { id: "p-templates",    label: "Templates",          sublabel: "Studio template gallery",      href: "/studio/templates",      kind: "page" },
  { id: "p-shop",         label: "My Shops",           sublabel: "Manage storefronts",           href: "/shop",                  kind: "page" },
  { id: "p-opportunity",  label: "Opportunity OS",     sublabel: "For-you feed",                 href: "/opportunity",           kind: "page" },
  { id: "p-listings",     label: "Opportunity Listings", sublabel: "Grants, fellowships, tenders", href: "/opportunity/listings", kind: "page" },
  { id: "p-cards",        label: "Opportunity Cards",  sublabel: "Business opportunity cards",   href: "/opportunity/cards",     kind: "page" },
  { id: "p-countries",    label: "Country Explorer",   sublabel: "Country intelligence",         href: "/opportunity/countries", kind: "page" },
  { id: "p-b2b",          label: "Alkebulan",          sublabel: "B2B marketplace directory",    href: "/b2b",                   kind: "page" },
  { id: "p-business",     label: "My Businesses",      sublabel: "Kebu ID & business profiles",  href: "/business",              kind: "page" },
  { id: "p-biz-reg",      label: "Register business",  sublabel: "Create a Kebu business",       href: "/business/register",     kind: "page" },
  { id: "p-messages",     label: "Customer Messages",  sublabel: "Site and shop conversations",  href: "/messages",              kind: "page" },
  { id: "p-chat",         label: "Chat",                sublabel: "Personal and business channels", href: "/chat",                  kind: "page" },
  { id: "p-spaces",       label: "Spaces",              sublabel: "Personal and business worlds",   href: "/spaces",                kind: "page" },
  { id: "p-library",      label: "Library",             sublabel: "Files, designs and sites",       href: "/library",               kind: "page" },
  { id: "p-docs",         label: "Docs",                sublabel: "Notes and documents",            href: "/docs",                  kind: "page" },
  { id: "p-tasks",        label: "Tasks",               sublabel: "Things to do",                   href: "/tasks",                 kind: "page" },
  { id: "p-calendar",     label: "Calendar",            sublabel: "Events and deadlines",           href: "/calendar",              kind: "page" },
  { id: "p-people",       label: "People",              sublabel: "Business teammates",             href: "/people",                kind: "page" },
  { id: "p-email",        label: "Email",               sublabel: "Campaigns and opportunity email", href: "/email",                 kind: "page" },
  { id: "p-work",         label: "Work",                sublabel: "Docs, tasks, time and people",   href: "/work",                  kind: "page" },
  { id: "p-tools",        label: "All tools",           sublabel: "Everything available in Kebu",  href: "/tools",                 kind: "page" },
  { id: "p-account",      label: "Account",            sublabel: "Profile & settings",           href: "/account",               kind: "page" },
  { id: "p-welcome",      label: "Personalize",        sublabel: "Intake & preferences",         href: "/welcome",               kind: "page" },
];

function score(item: SearchResult, q: string): number {
  const lq = q.toLowerCase();
  const ll = item.label.toLowerCase();
  const ls = (item.sublabel ?? "").toLowerCase();
  if (ll === lq) return 100;
  if (ll.startsWith(lq)) return 80;
  if (ll.includes(lq)) return 60;
  if (ls.includes(lq)) return 40;
  return 0;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);

  if (!q) {
    return NextResponse.json({ results: [], pages: STATIC_PAGES.slice(0, 8) });
  }

  const lq = q.toLowerCase();
  const entitlement = await loadAfricanOpportunityEntitlement({
    supabase,
    userId: user.id,
    sync: false,
  });
  const opportunitiesQuery = hasVerifiedAfricanOpportunityAccess(entitlement)
    ? supabase
        .from("opportunities")
        .select("id, title, country, type, verified_status, source_name")
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%,country.ilike.%${q}%`)
        .limit(6)
    : Promise.resolve({ data: [], error: null });

  // Run DB lookups in parallel
  const [sitesRes, designsRes, businessesRes, opportunitiesRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, subdomain, project_type")
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
      .ilike("title", `%${q}%`)
      .limit(6),
    supabase
      .from("create_designs")
      .select("id, title, design_type")
      .eq("owner_id", user.id)
      .ilike("title", `%${q}%`)
      .limit(6),
    supabase
      .from("businesses")
      .select("id, public_kebu_id, legal_name, trading_name")
      .ilike("legal_name", `%${q}%`)
      .limit(4),
    opportunitiesQuery,
  ]);

  const sites: SearchResult[] = (sitesRes.data ?? []).map((s) => ({
    id: `site-${s.id}`,
    label: s.title ?? "Untitled site",
    sublabel: s.subdomain ? `${s.subdomain}.kebu.co` : (s.project_type === "store" ? "Store" : "Site"),
    href: s.project_type === "store" ? `/shop/${s.id}` : `/my-sites/${s.id}`,
    kind: "site" as const,
    accent: "#FF5500",
  }));

  const designs: SearchResult[] = (designsRes.data ?? []).map((d) => ({
    id: `design-${d.id}`,
    label: d.title ?? "Untitled design",
    sublabel: (d.design_type ?? "design").replace(/_/g, " "),
    href: `/studio/${d.id}`,
    kind: "design" as const,
    accent: "#9333EA",
  }));

  const businesses: SearchResult[] = (businessesRes.data ?? []).map((b) => ({
    id: `biz-${b.id}`,
    label: b.trading_name ?? b.legal_name ?? "Business",
    sublabel: b.public_kebu_id ?? "Kebu Business",
    href: `/business/${b.id}`,
    kind: "business" as const,
    accent: "#10B981",
  }));

  const opportunities: SearchResult[] = (opportunitiesRes.data ?? []).map((o) => ({
    id: `opp-${o.id}`,
    label: o.title,
    sublabel: [o.type, o.country, o.source_name].filter(Boolean).join(" · "),
    href: `/opportunity/${o.id}`,
    kind: "opportunity" as const,
    accent: "#FF1F1F",
    source: "kebu_public" as const,
    trustLabel: o.verified_status ?? "needs_review",
  }));

  const pages = STATIC_PAGES
    .map((p) => ({ p, s: score(p, lq) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ p }) => p);

  const results: SearchResult[] = [...sites, ...designs, ...businesses, ...opportunities];

  return NextResponse.json({ results, pages });
}

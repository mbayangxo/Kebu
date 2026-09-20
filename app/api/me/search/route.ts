import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
import type { SearchResult } from "@/lib/search/types";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const entitlement = await loadAfricanOpportunityEntitlement({
    supabase,
    userId: user.id,
    sync: false,
  });
  const canSeeOpportunityIndex = hasVerifiedAfricanOpportunityAccess(entitlement);

  const wantsSites = mode === "all" || mode === "sites";
  const wantsBusiness = mode === "all" || mode === "business";
  const wantsDesigns = mode === "all" || mode === "designs";
  const wantsOpportunities = (mode === "all" || mode === "opportunities") && canSeeOpportunityIndex;

  const indexedPromise = wantsSites || wantsOpportunities
    ? (async () => {
        const admin = createAdminClient();
        let query = admin
          .from("search_documents")
          .select("id, mode, entity_type, entity_id, title, summary, source_url, source_name, trust_label, fetched_at")
          .textSearch("search_vector", q, { type: "websearch", config: "simple" })
          .limit(20);
        if (mode === "sites") query = query.eq("mode", "sites");
        if (mode === "opportunities") query = query.eq("mode", "opportunities");
        if (!canSeeOpportunityIndex) query = query.eq("access_scope", "public");
        const { data } = await query;
        return data ?? [];
      })()
    : Promise.resolve([]);

  const [indexedRows, designsRes, businessesRes] = await Promise.all([
    indexedPromise,
    wantsDesigns
      ? supabase.from("create_designs").select("id, title, design_type").eq("owner_id", user.id).ilike("title", `%${q}%`).limit(8)
      : Promise.resolve({ data: [], error: null }),
    wantsBusiness
      ? (async () => {
          const { data: memberships } = await supabase
            .from("business_members")
            .select("business_id")
            .eq("user_id", user.id)
            .eq("status", "active");
          const ids = (memberships ?? []).map((row) => row.business_id);
          if (!ids.length) return { data: [], error: null };
          return supabase
            .from("businesses")
            .select("id, public_kebu_id, legal_name, trading_name")
            .in("id", ids)
            .or(`legal_name.ilike.%${q}%,trading_name.ilike.%${q}%`)
            .limit(8);
        })()
      : Promise.resolve({ data: [], error: null }),
  ]);

  const indexed: SearchResult[] = indexedRows
    .filter((row) => row.mode !== "opportunities" || canSeeOpportunityIndex)
    .map((row) => ({
      id: `index-${row.id}`,
      label: row.title,
      sublabel: row.summary || row.source_name || undefined,
      href: row.mode === "opportunities" ? `/opportunity/${row.entity_id}` : row.source_url || `/sites/${row.entity_id}`,
      kind: row.mode === "opportunities" ? "opportunity" as const : "site" as const,
      accent: row.mode === "opportunities" ? "#FF1F1F" : "#FF6A00",
      source: row.mode === "opportunities" ? "kebu_public" as const : "kebu_public" as const,
      trustLabel: row.trust_label || undefined,
      sourceUrl: row.source_url || undefined,
      sourceName: row.source_name || undefined,
      fetchedAt: row.fetched_at || undefined,
    }));

  const designs: SearchResult[] = (designsRes.data ?? []).map((d) => ({
    id: `design-${d.id}`,
    label: d.title ?? "Untitled design",
    sublabel: (d.design_type ?? "design").replace(/_/g, " "),
    href: `/studio/${d.id}`,
    kind: "design" as const,
    accent: "#9333EA",
    source: "kebu_private" as const,
    sourceName: "Your Kebu Studio",
  }));

  const businesses: SearchResult[] = (businessesRes.data ?? []).map((b) => ({
    id: `biz-${b.id}`,
    label: b.trading_name ?? b.legal_name ?? "Business",
    sublabel: b.public_kebu_id ?? "Kebu Business",
    href: `/business/${b.id}`,
    kind: "business" as const,
    accent: "#10B981",
    source: "kebu_private" as const,
    sourceName: "Your Kebu businesses",
  }));

  const results: SearchResult[] = [...indexed, ...designs, ...businesses];

  const pages = STATIC_PAGES
    .map((p) => ({ p, s: score(p, lq) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ p }) => p);

  return NextResponse.json({ results, pages, mode, opportunityAccess: canSeeOpportunityIndex });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
import type { SearchResult } from "@/lib/search/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchMode = "all" | "sites" | "business" | "designs" | "opportunities";

const STATIC_PAGES: SearchResult[] = [
  { id: "p-dashboard", label: "Your Kebu", sublabel: "Home dashboard", href: "/dashboard", kind: "page" },
  { id: "p-browser", label: "Browser", sublabel: "Tabs, journeys, bookmarks and reader", href: "/browser", kind: "page" },
  { id: "p-my-sites", label: "My Sites", sublabel: "All your sites", href: "/my-sites", kind: "page" },
  { id: "p-create-new", label: "New site", sublabel: "Start building", href: "/create/new", kind: "page" },
  { id: "p-aesthetics", label: "Aesthetic Gallery", sublabel: "Browse site styles", href: "/create/aesthetics", kind: "page" },
  { id: "p-studio", label: "Studio", sublabel: "Design workspace", href: "/studio", kind: "page" },
  { id: "p-studio-new", label: "New design", sublabel: "Create in Studio", href: "/studio/new", kind: "page" },
  { id: "p-brand", label: "Brand DNA", sublabel: "Colors, voice, logo", href: "/studio/brand", kind: "page" },
  { id: "p-shop", label: "My Shops", sublabel: "Manage storefronts", href: "/shop", kind: "page" },
  { id: "p-opportunity", label: "Opportunity OS", sublabel: "For-you feed", href: "/opportunity", kind: "page" },
  { id: "p-listings", label: "Opportunity Listings", sublabel: "Grants, fellowships, tenders", href: "/opportunity/listings", kind: "page" },
  { id: "p-countries", label: "Country Explorer", sublabel: "Country intelligence", href: "/opportunity/countries", kind: "page" },
  { id: "p-business", label: "My Businesses", sublabel: "Kebu ID & business profiles", href: "/business", kind: "page" },
  { id: "p-messages", label: "Customer Messages", sublabel: "Site and shop conversations", href: "/messages", kind: "page" },
  { id: "p-chat", label: "Chat", sublabel: "Personal and business channels", href: "/chat", kind: "page" },
  { id: "p-spaces", label: "Spaces", sublabel: "Personal and business worlds", href: "/spaces", kind: "page" },
  { id: "p-rooms", label: "Rooms", sublabel: "Project collaboration rooms", href: "/rooms", kind: "page" },
  { id: "p-library", label: "Library", sublabel: "Files, designs and sites", href: "/library", kind: "page" },
  { id: "p-docs", label: "Docs", sublabel: "Notes and documents", href: "/docs", kind: "page" },
  { id: "p-tasks", label: "Tasks", sublabel: "Things to do", href: "/tasks", kind: "page" },
  { id: "p-calendar", label: "Calendar", sublabel: "Events and deadlines", href: "/calendar", kind: "page" },
  { id: "p-people", label: "People", sublabel: "Business teammates", href: "/people", kind: "page" },
  { id: "p-email", label: "Mail", sublabel: "Personal Kebu mailbox", href: "/email", kind: "page" },
  { id: "p-work", label: "Work", sublabel: "Docs, tasks, time and people", href: "/work", kind: "page" },
  { id: "p-tools", label: "All tools", sublabel: "Everything available in Kebu", href: "/tools", kind: "page" },
  { id: "p-account", label: "Account", sublabel: "Profile & settings", href: "/account", kind: "page" },
  { id: "p-welcome", label: "Personalize", sublabel: "Intake & preferences", href: "/welcome", kind: "page" },
];

function score(item: SearchResult, q: string): number {
  const needle = q.toLowerCase();
  const label = item.label.toLowerCase();
  const sublabel = (item.sublabel ?? "").toLowerCase();
  if (label === needle) return 100;
  if (label.startsWith(needle)) return 80;
  if (label.includes(needle)) return 60;
  if (sublabel.includes(needle)) return 40;
  return 0;
}

function parseMode(value: string | null): SearchMode {
  return value === "sites" || value === "business" || value === "designs" || value === "opportunities" ? value : "all";
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const mode = parseMode(searchParams.get("mode"));

  if (!q) {
    return NextResponse.json({ results: [], pages: STATIC_PAGES.slice(0, 12), mode });
  }

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
          .select("id, mode, entity_type, entity_id, title, summary, source_url, source_name, trust_label, fetched_at, access_scope")
          .textSearch("search_vector", q, { type: "websearch", config: "simple" })
          .limit(20);

        if (mode === "sites") query = query.eq("mode", "sites");
        else if (mode === "opportunities") query = query.eq("mode", "opportunities");
        else if (!canSeeOpportunityIndex) query = query.eq("access_scope", "public");

        const { data, error } = await query;
        return error ? [] : data ?? [];
      })()
    : Promise.resolve([]);

  const designsPromise = wantsDesigns
    ? supabase
        .from("create_designs")
        .select("id, title, design_type")
        .eq("owner_id", user.id)
        .ilike("title", `%${q}%`)
        .limit(8)
    : Promise.resolve({ data: [], error: null });

  const businessesPromise = wantsBusiness
    ? (async () => {
        const { data: memberships } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("user_id", user.id)
          .eq("status", "active");
        const ids = (memberships ?? []).map((row: { business_id: string }) => row.business_id);
        if (!ids.length) return { data: [], error: null };
        return supabase
          .from("businesses")
          .select("id, public_kebu_id, legal_name, trading_name")
          .in("id", ids)
          .or(`legal_name.ilike.%${q}%,trading_name.ilike.%${q}%`)
          .limit(8);
      })()
    : Promise.resolve({ data: [], error: null });

  const [indexedRows, designsRes, businessesRes] = await Promise.all([
    indexedPromise,
    designsPromise,
    businessesPromise,
  ]);

  const indexed: SearchResult[] = indexedRows
    .filter((row: {
      mode: string;
      access_scope: string;
    }) => row.mode !== "opportunities" || canSeeOpportunityIndex)
    .map((row: {
      id: string;
      mode: string;
      entity_id: string;
      title: string;
      summary: string | null;
      source_url: string | null;
      source_name: string | null;
      trust_label: string | null;
      fetched_at: string | null;
    }) => ({
      id: `index-${row.id}`,
      label: row.title,
      sublabel: row.summary || row.source_name || undefined,
      href: row.mode === "opportunities" ? `/opportunity/${row.entity_id}` : row.source_url || `/sites/${row.entity_id}`,
      kind: row.mode === "opportunities" ? "opportunity" as const : "site" as const,
      accent: row.mode === "opportunities" ? "#FF1F1F" : "#FF6A00",
      source: "kebu_public" as const,
      trustLabel: row.trust_label || undefined,
      sourceUrl: row.source_url || undefined,
      sourceName: row.source_name || undefined,
      fetchedAt: row.fetched_at || undefined,
    }));

  const designs: SearchResult[] = ((designsRes.data ?? []) as Array<{
    id: string;
    title: string | null;
    design_type: string | null;
  }>).map((design) => ({
    id: `design-${design.id}`,
    label: design.title ?? "Untitled design",
    sublabel: (design.design_type ?? "design").replace(/_/g, " "),
    href: `/studio/${design.id}`,
    kind: "design" as const,
    accent: "#9333EA",
    source: "kebu_private" as const,
    sourceName: "Your Kebu Studio",
  }));

  const businesses: SearchResult[] = ((businessesRes.data ?? []) as Array<{
    id: string;
    public_kebu_id: string | null;
    legal_name: string | null;
    trading_name: string | null;
  }>).map((business) => ({
    id: `biz-${business.id}`,
    label: business.trading_name ?? business.legal_name ?? "Business",
    sublabel: business.public_kebu_id ?? "Kebu Business",
    href: `/business/${business.id}`,
    kind: "business" as const,
    accent: "#10B981",
    source: "kebu_private" as const,
    sourceName: "Your Kebu businesses",
  }));

  const pages = STATIC_PAGES
    .map((page) => ({ page, score: score(page, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.page);

  return NextResponse.json({
    results: [...indexed, ...designs, ...businesses],
    pages,
    mode,
    opportunityAccess: canSeeOpportunityIndex,
  });
}

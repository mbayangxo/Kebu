import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { rowToMeProfile } from "@/lib/account/user-profile";
import type { HomeSummary, HomeUpdate } from "@/lib/account/home-summary";
import { createServiceClient } from "@/lib/opportunity/admin";
import { rowToOpportunityProfile } from "@/lib/opportunity/intake-schema";
import { toPersonalizationSummary } from "@/lib/account/kebu-personalization";
import { ensureAfriqueIdForUser } from "@/lib/afrique-id/ensure-afrique-id";

export const dynamic = "force-dynamic";

/** Aggregated signed-in home — real DB data only. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("id, name, email, avatar_url, residence_country")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow
    ? rowToMeProfile(profileRow)
    : rowToMeProfile({
        id: user.id,
        email: user.email ?? null,
        name: (user as { user_metadata?: { name?: string } }).user_metadata?.name ?? null,
      });

  const { data: intakeRow } = await supabase
    .from("opportunity_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const opportunityProfile = intakeRow ? rowToOpportunityProfile(intakeRow) : null;
  const needsIntake = !intakeRow?.intake_complete;
  const personalization = toPersonalizationSummary(opportunityProfile, needsIntake);

  const ensuredAfrique = await ensureAfriqueIdForUser({
    supabase,
    userId: user.id,
    countryCode: profileRow?.residence_country ?? null,
  });
  const afriquePublicId = ensuredAfrique.ok ? ensuredAfrique.afriqueId.publicAfriqueId : null;

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const businessIds = (memberships ?? []).map((m) => m.business_id);
  const roleByBusiness = new Map((memberships ?? []).map((m) => [m.business_id, m.role]));

  let businesses: HomeSummary["businesses"] = [];
  if (businessIds.length > 0) {
    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id, public_kebu_id, legal_name, trading_name")
      .in("id", businessIds);

    const { data: scores } = await supabase
      .from("business_readiness_scores")
      .select("business_id, score_value, score_band, calculated_at")
      .in("business_id", businessIds)
      .order("calculated_at", { ascending: false });

    const latestScore = new Map<string, { score_value: number; score_band: string }>();
    for (const s of scores ?? []) {
      if (!latestScore.has(s.business_id)) {
        latestScore.set(s.business_id, { score_value: s.score_value, score_band: s.score_band });
      }
    }

    businesses = (bizRows ?? []).map((b) => {
      const sc = latestScore.get(b.id);
      return {
        id: b.id,
        publicKebuId: b.public_kebu_id,
        name: b.trading_name || b.legal_name,
        role: roleByBusiness.get(b.id) ?? "member",
        readinessScore: sc?.score_value ?? null,
        readinessBand: sc?.score_band ?? null,
      };
    });
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, project_type, status, subdomain, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const projectList = projects ?? [];
  const projectIds = projectList.map((p) => p.id);

  let productCountByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: products, error: prodErr } = await supabase
      .from("project_products")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("is_active", true);
    if (!prodErr) {
      for (const row of products ?? []) {
        productCountByProject.set(row.project_id, (productCountByProject.get(row.project_id) ?? 0) + 1);
      }
    }
  }

  const sites: HomeSummary["sites"] = projectList.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    projectType: p.project_type,
    subdomain: p.subdomain,
    productCount: productCountByProject.get(p.id) ?? 0,
  }));

  let emailSubscribers = 0;
  let draftCampaigns = 0;
  let lastCampaignSubject: string | null = null;
  if (businessIds.length > 0) {
    const { count: subCount } = await supabase
      .from("business_email_subscribers")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .is("unsubscribed_at", null);
    if (subCount != null) emailSubscribers = subCount;

    const { data: campaigns, error: campErr } = await supabase
      .from("business_email_campaigns")
      .select("subject, status, created_at")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!campErr && campaigns) {
      draftCampaigns = campaigns.filter((c) => c.status === "draft").length;
      lastCampaignSubject = campaigns[0]?.subject ?? null;
    }
  }

  let createDesigns = 0;
  const { count: designCount } = await supabase
    .from("create_designs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if (designCount != null) createDesigns = designCount;

  let countriesLive = 0;
  const admin = createServiceClient();
  if (admin) {
    const { count } = await admin
      .from("country_profiles")
      .select("country_code", { count: "exact", head: true })
      .eq("publish_status", "published");
    if (count != null) countriesLive = count;
  }

  const storeProducts = sites.reduce((n, s) => n + s.productCount, 0);
  const sitesPublished = sites.filter((s) => s.status === "published").length;

  const updates: HomeUpdate[] = [];

  for (const site of sites.slice(0, 6)) {
    if (site.status !== "published") {
      updates.push({
        id: `site-draft-${site.id}`,
        kind: "site",
        title: site.title,
        body: "Draft site — publish when you are ready for customers to visit.",
        href: `/create/${site.id}`,
        at: null,
      });
    } else if (site.projectType === "store" && site.productCount === 0) {
      updates.push({
        id: `store-empty-${site.id}`,
        kind: "site",
        title: site.title,
        body: "Your store is live but has no products yet. Add products in Kebu Builder.",
        href: `/create/${site.id}`,
        at: null,
      });
    } else if (site.status === "published" && site.subdomain) {
      updates.push({
        id: `site-live-${site.id}`,
        kind: "site",
        title: site.title,
        body:
          site.projectType === "store"
            ? `Store live · ${site.productCount} product${site.productCount === 1 ? "" : "s"}`
            : "Site is published and live.",
        href: `/sites/${site.subdomain}`,
        at: null,
      });
    }
  }

  for (const b of businesses) {
    if (b.readinessScore == null) {
      updates.push({
        id: `biz-score-${b.id}`,
        kind: "business",
        title: b.name,
        body: "Complete your business profile and documents to unlock your readiness score.",
        href: `/business/${b.id}`,
        at: null,
      });
    } else if (b.readinessScore < 70) {
      updates.push({
        id: `biz-grow-${b.id}`,
        kind: "business",
        title: b.name,
        body: `Readiness ${b.readinessScore} (${b.readinessBand?.replace(/_/g, " ") ?? "building"}) — see what to improve next.`,
        href: `/account#readiness`,
        at: null,
      });
    }
  }

  if (emailSubscribers > 0) {
    updates.push({
      id: "email-subs",
      kind: "email",
      title: "Customer emails",
      body: `${emailSubscribers} subscriber${emailSubscribers === 1 ? "" : "s"} on your list. Send a campaign from your business dashboard.`,
      href: businesses[0] ? `/business/${businesses[0].id}` : "/account",
      at: null,
    });
  } else if (businesses.length > 0 && sites.some((s) => s.status === "published")) {
    updates.push({
      id: "email-capture",
      kind: "email",
      title: "Capture customer emails",
      body: "Add a Newsletter section to your published site, or add emails manually on your business dashboard.",
      href: businesses[0] ? `/business/${businesses[0].id}` : "/account",
      at: null,
    });
  }

  if (draftCampaigns > 0 && businesses[0]) {
    updates.push({
      id: "email-draft",
      kind: "email",
      title: "Email campaign draft",
      body: `You have ${draftCampaigns} draft campaign${draftCampaigns === 1 ? "" : "s"} ready to send.`,
      href: `/business/${businesses[0].id}`,
      at: null,
    });
  }

  if (createDesigns > 0) {
    updates.push({
      id: "create-designs",
      kind: "create",
      title: "Kebu Create",
      body: `${createDesigns} design${createDesigns === 1 ? "" : "s"} saved — use them in email campaigns or download for social.`,
      href: "/studio",
      at: null,
    });
  }

  if (countriesLive > 0) {
    updates.push({
      id: "opportunity-countries",
      kind: "opportunity",
      title: "Opportunity OS",
      body: personalization.exploreOnly
        ? `${countriesLive} African countries to explore — matched to what you told us.`
        : `${countriesLive} country profile${countriesLive === 1 ? "" : "s"} live — research what to build.`,
      href: personalization.needsIntake ? "/welcome?next=/opportunity" : "/opportunity",
      at: null,
    });
  }

  if (personalization.needsIntake) {
    updates.unshift({
      id: "kebu-intake",
      kind: "opportunity",
      title: "Tell Kebu about you",
      body: "No business required — 3 minutes so Opportunity OS, Yande AI, and your home fit you.",
      href: "/welcome",
      at: null,
    });
  } else if (personalization.enjoyDoing) {
    updates.unshift({
      id: "kebu-personalized",
      kind: "opportunity",
      title: `Your focus: ${personalization.mainGoalLabel}`,
      body: personalization.enjoyDoing.slice(0, 120) + (personalization.enjoyDoing.length > 120 ? "…" : ""),
      href: "/opportunity",
      at: null,
    });
  }

  if (updates.length === 0) {
    updates.push({
      id: "get-started",
      kind: "opportunity",
      title: "Welcome to Kebu",
      body: personalization.exploreOnly
        ? "Explore Africa in Opportunity OS — no business needed."
        : "Explore a country, build a site in Kebu Builder, or register a business when you are ready.",
      href: personalization.needsIntake ? "/welcome" : "/opportunity",
      at: null,
    });
  }

  const summary: HomeSummary = {
    profile: {
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      afriqueId: afriquePublicId,
    },
    stats: {
      sitesTotal: sites.length,
      sitesPublished,
      storeProducts,
      emailSubscribers,
      createDesigns,
      countriesLive,
    },
    businesses,
    sites,
    email: {
      subscribers: emailSubscribers,
      draftCampaigns,
      lastCampaignSubject,
    },
    opportunities: {
      count: countriesLive,
      exploreHref: personalization.needsIntake ? "/welcome?next=/opportunity" : "/opportunity",
    },
    personalization,
    updates: updates.slice(0, 12),
  };

  return NextResponse.json({ summary });
}

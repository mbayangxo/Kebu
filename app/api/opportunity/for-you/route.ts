import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import { rowToOpportunityProfile } from "@/lib/opportunity/intake-schema";
import {
  buildPersonalizedPlan,
  filterCountriesForProfile,
  filterStoriesForProfile,
  type CountryForMatch,
  type StoryForMatch,
} from "@/lib/opportunity/personalize";

export const dynamic = "force-dynamic";

/** Personalized Kebu Opportunity OS feed — intake + verified African entitlement; uses real DB data. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const entitlement = await loadAfricanOpportunityEntitlement({ supabase, userId: user.id });

  const { data: profileRow } = await supabase
    .from("opportunity_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileRow?.intake_complete) {
    return NextResponse.json({
      needsIntake: true,
      redirect: "/opportunity/intake",
      entitlement,
    });
  }

  if (!hasVerifiedAfricanOpportunityAccess(entitlement)) {
    return NextResponse.json({
      needsEntitlement: true,
      entitlement,
      message:
        entitlement.status === "pending"
          ? "Your African ID verification is in review. Protected personalization unlocks when verified."
          : "Kebu Opportunity OS protected intelligence requires verified African Access. Country Explorer and Opportunity Cards stay open — verify once on your account.",
      verifyHref: "/account#african-id",
      exploreHref: "/opportunity/countries",
      cardsHref: "/opportunity/cards",
    });
  }

  const profile = rowToOpportunityProfile(profileRow);
  const admin = createServiceClient() ?? supabase;

  const { data: countriesRaw } = await admin
    .from("country_profiles")
    .select(
      "country, country_code, capital, population, industries, data_confidence, agricultural_products, manufacturing_sectors, public_entrepreneurship_programs, youth_programs, procurement_links",
    )
    .eq("publish_status", "published");

  const { data: storiesRaw } = await admin
    .from("opportunity_stories")
    .select(
      "id, slug, title, person_name, country_code, era, summary, lesson, themes, resource_tags, trust_label, source_url",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const countries = filterCountriesForProfile((countriesRaw ?? []) as CountryForMatch[], profile).slice(0, 12);
  const stories = filterStoriesForProfile((storiesRaw ?? []) as StoryForMatch[], profile).slice(0, 6);
  const plan = buildPersonalizedPlan(profile);

  return NextResponse.json({
    needsIntake: false,
    needsEntitlement: false,
    entitlement,
    profile,
    plan,
    countries,
    stories,
    filters: {
      interestPaths: profile.interestPaths,
      resourceNeeds: profile.resourceNeeds,
      preferredCountryCodes: profile.preferredCountryCodes,
      startingBudgetBand: profile.startingBudgetBand,
    },
  });
}

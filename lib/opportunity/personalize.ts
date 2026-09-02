import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";

export type CountryForMatch = {
  country: string;
  country_code: string;
  industries: string[] | null;
  agricultural_products?: string[] | null;
  manufacturing_sectors?: string[] | null;
  public_entrepreneurship_programs?: string[] | null;
  youth_programs?: string[] | null;
  procurement_links?: unknown;
};

export type StoryForMatch = {
  id: string;
  slug: string;
  title: string;
  person_name: string;
  country_code: string | null;
  era: string;
  summary: string;
  lesson: string;
  themes: string[];
  resource_tags: string[];
  trust_label: string;
  source_url: string | null;
};

export type PersonalizedPlan = {
  headline: string;
  summary: string;
  startSteps: string[];
  resourceHints: { label: string; detail: string }[];
};

const INTEREST_TO_INDUSTRY: Record<string, string[]> = {
  construction_bidding: ["construction", "infrastructure", "housing", "logistics"],
  agriculture_resources: ["agriculture", "food", "agro"],
  tech_software: ["tech", "technology", "software", "fintech"],
  creative_media: ["media", "creative", "music", "film", "fashion"],
  manufacturing: ["manufacturing", "industrial"],
  trade_import_export: ["trade", "export", "import", "logistics"],
  retail_store: ["retail", "commerce", "trade"],
};

export function scoreCountryForProfile(country: CountryForMatch, profile: OpportunityProfile): number {
  let score = 0;
  const code = country.country_code.toUpperCase();
  const prefs = profile.preferredCountryCodes.map((c) => c.toUpperCase());
  if (prefs.length > 0 && prefs.includes(code)) score += 40;
  else if (prefs.length === 0) score += 10;

  const industries = (country.industries ?? []).join(" ").toLowerCase();
  for (const path of profile.interestPaths) {
    const keys = INTEREST_TO_INDUSTRY[path] ?? [path.replace(/_/g, " ")];
    if (keys.some((k) => industries.includes(k))) score += 15;
  }

  if (profile.resourceNeeds.includes("startup_programs") && (country.youth_programs?.length ?? 0) > 0) {
    score += 10;
  }
  if (profile.resourceNeeds.includes("grants") && (country.public_entrepreneurship_programs?.length ?? 0) > 0) {
    score += 10;
  }
  if (profile.interestPaths.includes("agriculture_resources") && (country.agricultural_products?.length ?? 0) > 0) {
    score += 12;
  }

  return score;
}

export function filterCountriesForProfile(
  countries: CountryForMatch[],
  profile: OpportunityProfile,
): CountryForMatch[] {
  return [...countries]
    .map((c) => ({ c, score: scoreCountryForProfile(c, profile) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

export function filterStoriesForProfile(stories: StoryForMatch[], profile: OpportunityProfile): StoryForMatch[] {
  const themes = new Set(profile.interestPaths);
  const resources = new Set(profile.resourceNeeds);
  const prefs = new Set(profile.preferredCountryCodes.map((c) => c.toUpperCase()));

  return [...stories]
    .map((s) => {
      let score = 0;
      if (s.themes.some((t) => themes.has(t))) score += 20;
      if (s.resource_tags.some((t) => resources.has(t))) score += 15;
      if (s.country_code && prefs.has(s.country_code.toUpperCase())) score += 25;
      if (profile.interestPaths.includes("ancestry_heritage") && s.era === "ancestral_legacy") score += 20;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

export function buildPersonalizedPlan(profile: OpportunityProfile): PersonalizedPlan {
  const budget = profile.startingBudgetBand ?? "not_sure";
  const steps: string[] = [];
  const hints: { label: string; detail: string }[] = [];

  if (budget === "under_50k" || budget === "not_sure") {
    steps.push("Start with a service or product you can sell this month — prove demand before big spend.");
    hints.push({ label: "Low cash start", detail: "Services, resale, digital products, or subcontracting often need less capital than factories." });
  }
  if (budget === "50k_500k") {
    steps.push("Pick one offer, one customer channel (WhatsApp, market stall, or site), and track every sale.");
  }
  if (profile.resourceNeeds.includes("grants")) {
    hints.push({ label: "Grants", detail: "Country profiles list public entrepreneurship and youth programs — filter Countries for your code." });
  }
  if (profile.resourceNeeds.includes("tenders_contracts") || profile.interestPaths.includes("construction_bidding")) {
    hints.push({ label: "Tenders & contracts", detail: "Open country profiles for procurement links and registration guidance — formal ID helps you bid." });
    steps.push("Register your business identity (Kebu ID) before chasing large contracts.");
  }
  if (profile.resourceNeeds.includes("loans")) {
    hints.push({ label: "Loans", detail: "Banks and microfinance need records — even informal sales history helps your case." });
  }
  if (profile.interestPaths.includes("ancestry_heritage")) {
    steps.push("Read heritage stories — see how trade, craft, and organization built wealth before modern borders.");
  }
  if (profile.goals.includes("start_business") || profile.mainGoal === "start_business") {
    steps.push("Use Kebu Builder to launch a simple site or store when you have a clear offer.");
  }

  if (steps.length === 0) {
    steps.push("Explore your top country match, then pick one interest to go deep on this week.");
  }

  const enjoy = profile.enjoyDoing.trim();
  const headline = enjoy
    ? `Built around what you enjoy: ${enjoy.slice(0, 80)}${enjoy.length > 80 ? "…" : ""}`
    : "Your Opportunity path";

  return {
    headline,
    summary: `Goals: ${profile.goals.slice(0, 3).join(", ").replace(/_/g, " ")}. Budget band: ${budget.replace(/_/g, " ")}.`,
    startSteps: steps.slice(0, 5),
    resourceHints: hints.slice(0, 6),
  };
}

import { z } from "zod";

export const KEBU_HERE_FOR = [
  { id: "explore_africa", label: "Explore Africa — learn the continent", icon: "🌍", desc: "No business needed" },
  { id: "find_my_path", label: "Find my path — what I can do & offer", icon: "✨", desc: "Discover your place" },
  { id: "start_business", label: "Start or grow a business", icon: "🚀", desc: "Build something real" },
  { id: "learn_skills", label: "Learn skills for the future", icon: "🎓", desc: "Grow before you build" },
  { id: "just_browsing", label: "Just looking around for now", icon: "👀", desc: "No pressure" },
] as const;

export const OPPORTUNITY_GOALS = [
  { id: "start_business", label: "Start a business", icon: "🚀" },
  { id: "grow_business", label: "Grow what I already have", icon: "📈" },
  { id: "find_job", label: "Find work or contracts", icon: "💼" },
  { id: "learn_skills", label: "Learn how to do something new", icon: "🎓" },
  { id: "export_trade", label: "Trade or export", icon: "🌍" },
  { id: "build_wealth", label: "Build long-term wealth", icon: "🏦" },
  { id: "help_community", label: "Help my community", icon: "🤝" },
] as const;

export const OPPORTUNITY_INTERESTS = [
  { id: "construction_bidding", label: "Construction & bidding", desc: "Tenders, contracts, building" },
  { id: "agriculture_resources", label: "Agriculture & land", desc: "Farming, processing, exports" },
  { id: "grants_funding", label: "Grants & programs", desc: "Non-dilutive funding" },
  { id: "loans_credit", label: "Loans & credit", desc: "Finance to start or grow" },
  { id: "jobs_employment", label: "Jobs & gigs", desc: "Employment and freelance work" },
  { id: "trade_import_export", label: "Import / export", desc: "Moving goods across borders" },
  { id: "tech_software", label: "Tech & software", desc: "Apps, platforms, digital" },
  { id: "creative_media", label: "Creative & media", desc: "Music, film, fashion, content" },
  { id: "ancestry_heritage", label: "Heritage & ancestors", desc: "What we built before — and again" },
  { id: "retail_store", label: "Shops & retail", desc: "Selling products locally" },
  { id: "manufacturing", label: "Making things", desc: "Factories, workshops, goods" },
] as const;

export const OPPORTUNITY_RESOURCE_NEEDS = [
  { id: "grants", label: "Grants" },
  { id: "loans", label: "Loans" },
  { id: "tenders_contracts", label: "Tenders & contracts" },
  { id: "jobs", label: "Jobs" },
  { id: "mentors", label: "Mentors & programs" },
  { id: "ancestral_knowledge", label: "Heritage & resources history" },
  { id: "country_intel", label: "Country intelligence" },
  { id: "startup_programs", label: "Startup & youth programs" },
] as const;

export const BUDGET_BANDS = [
  { id: "under_50k", label: "Under ~$500 / very little", hint: "Bootstrap, services, side hustle" },
  { id: "50k_500k", label: "~$500 – $5,000", hint: "Small shop, tools, first inventory" },
  { id: "500k_5m", label: "~$5,000 – $50,000", hint: "Equipment, team, formal setup" },
  { id: "5m_plus", label: "$50,000+", hint: "Serious capital — loans, investors, tenders" },
  { id: "not_sure", label: "Not sure yet", hint: "We'll help you plan from zero" },
] as const;

export const opportunityIntakeSchema = z
  .object({
    mainGoal: z.string().trim().min(1).max(80),
    goals: z.array(z.string()).min(1).max(8),
    interestPaths: z.array(z.string()).max(12),
    resourceNeeds: z.array(z.string()).max(10),
    startingBudgetBand: z.enum(["under_50k", "50k_500k", "500k_5m", "5m_plus", "not_sure"]),
    preferredCountryCodes: z.array(z.string().length(2)).max(8),
    enjoyDoing: z.string().trim().max(500),
    intakeComplete: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const exploring =
      data.mainGoal === "just_browsing" ||
      data.mainGoal === "explore_africa" ||
      data.goals.includes("just_browsing") ||
      data.goals.includes("explore_africa");
    if (!exploring && data.interestPaths.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick at least one interest.", path: ["interestPaths"] });
    }
    if (!exploring && data.resourceNeeds.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick at least one resource need.", path: ["resourceNeeds"] });
    }
  });

export type OpportunityProfile = {
  userId: string;
  mainGoal: string | null;
  goals: string[];
  interestPaths: string[];
  resourceNeeds: string[];
  startingBudgetBand: string | null;
  preferredCountryCodes: string[];
  enjoyDoing: string;
  intakeComplete: boolean;
  intakeVersion: string;
};

export function rowToOpportunityProfile(row: {
  user_id: string;
  main_goal: string | null;
  goals: string[] | null;
  interest_paths: string[] | null;
  resource_needs: string[] | null;
  starting_budget_band: string | null;
  preferred_country_codes: string[] | null;
  enjoy_doing: string | null;
  intake_complete: boolean;
  intake_version: string;
}): OpportunityProfile {
  return {
    userId: row.user_id,
    mainGoal: row.main_goal,
    goals: row.goals ?? [],
    interestPaths: row.interest_paths ?? [],
    resourceNeeds: row.resource_needs ?? [],
    startingBudgetBand: row.starting_budget_band,
    preferredCountryCodes: row.preferred_country_codes ?? [],
    enjoyDoing: row.enjoy_doing ?? "",
    intakeComplete: row.intake_complete,
    intakeVersion: row.intake_version,
  };
}

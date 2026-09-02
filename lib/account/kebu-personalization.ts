import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";
import { KEBU_HERE_FOR, OPPORTUNITY_GOALS } from "@/lib/opportunity/intake-schema";

const GOAL_LABELS = new Map<string, string>([
  ...KEBU_HERE_FOR.map((g) => [g.id, g.label] as const),
  ...OPPORTUNITY_GOALS.map((g) => [g.id, g.label] as const),
]);

export function mainGoalLabel(id: string | null | undefined): string {
  if (!id) return "Exploring Kebu";
  return GOAL_LABELS.get(id) ?? id.replace(/_/g, " ");
}

export function userIsExploreOnly(profile: OpportunityProfile | null): boolean {
  if (!profile) return true;
  const buildIds = new Set(["start_business", "grow_business", "export_trade", "build_wealth", "find_job"]);
  if (buildIds.has(profile.mainGoal ?? "")) return false;
  if (profile.goals.some((g) => buildIds.has(g))) return false;
  const exploreIds = new Set(["explore_africa", "find_my_path", "just_browsing", "learn_skills"]);
  return exploreIds.has(profile.mainGoal ?? "") || profile.goals.some((g) => exploreIds.has(g));
}

export function formatProfileForYande(profile: OpportunityProfile | null): string {
  if (!profile?.intakeComplete) {
    return "User has not completed Kebu personal intake yet. Encourage them to finish /welcome — no business required to explore Africa and Opportunity OS.";
  }
  const parts = [
    `Main reason on Kebu: ${mainGoalLabel(profile.mainGoal)}`,
    profile.goals.length ? `Also cares about: ${profile.goals.map(mainGoalLabel).join(", ")}` : null,
    profile.interestPaths.length
      ? `Interests: ${profile.interestPaths.map((p) => p.replace(/_/g, " ")).join(", ")}`
      : null,
    profile.resourceNeeds.length
      ? `Resource needs: ${profile.resourceNeeds.map((r) => r.replace(/_/g, " ")).join(", ")}`
      : null,
    profile.preferredCountryCodes.length ? `Country focus: ${profile.preferredCountryCodes.join(", ")}` : null,
    profile.startingBudgetBand ? `Budget band: ${profile.startingBudgetBand.replace(/_/g, " ")}` : null,
    profile.enjoyDoing.trim() ? `Enjoys / good at: ${profile.enjoyDoing.trim()}` : null,
    userIsExploreOnly(profile)
      ? "Mode: exploring — do NOT push business registration unless they ask."
      : "Mode: may want to build — can suggest Builder, Kebu ID when relevant.",
  ];
  return parts.filter(Boolean).join(". ");
}

export type KebuPersonalizationSummary = {
  needsIntake: boolean;
  mainGoal: string | null;
  mainGoalLabel: string;
  enjoyDoing: string;
  exploreOnly: boolean;
  intakeHref: string;
};

export function toPersonalizationSummary(
  profile: OpportunityProfile | null,
  needsIntake: boolean,
): KebuPersonalizationSummary {
  return {
    needsIntake,
    mainGoal: profile?.mainGoal ?? null,
    mainGoalLabel: mainGoalLabel(profile?.mainGoal),
    enjoyDoing: profile?.enjoyDoing?.trim() ?? "",
    exploreOnly: userIsExploreOnly(profile),
    intakeHref: "/welcome",
  };
}

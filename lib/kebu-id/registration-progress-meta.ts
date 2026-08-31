/** Which registration steps are automated vs blocked (honest tracker — no fake pending gov steps). */

export type StepAutomation = "auto" | "user_action" | "blocked";

export const REGISTRATION_STEP_AUTOMATION: Record<string, StepAutomation> = {
  business_created: "auto",
  documents_uploaded: "user_action",
  business_information_complete: "auto",
  government_review: "blocked",
  payment_confirmed: "blocked",
  approved: "blocked",
  registration_certificate: "blocked",
  tax_registration: "blocked",
  active_business: "blocked",
};

export function stepBlockedLabel(stepKey: string): string | null {
  if (REGISTRATION_STEP_AUTOMATION[stepKey] !== "blocked") return null;
  return "Waiting on government registration integration — not available in Kebu yet.";
}

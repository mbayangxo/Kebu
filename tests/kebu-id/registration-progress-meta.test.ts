import { describe, expect, it } from "vitest";
import { REGISTRATION_TIMELINE } from "@/lib/kebu-id/readiness";
import {
  REGISTRATION_STEP_AUTOMATION,
  stepBlockedLabel,
} from "@/lib/kebu-id/registration-progress-meta";

describe("registration progress meta", () => {
  it("defines nine canonical timeline steps in order", () => {
    expect(REGISTRATION_TIMELINE).toHaveLength(9);
    expect(REGISTRATION_TIMELINE.map((s) => s.stepKey)).toEqual([
      "business_created",
      "documents_uploaded",
      "business_information_complete",
      "government_review",
      "payment_confirmed",
      "approved",
      "registration_certificate",
      "tax_registration",
      "active_business",
    ]);
  });

  it("marks government and post-submit steps as blocked", () => {
    for (const key of [
      "government_review",
      "payment_confirmed",
      "approved",
      "registration_certificate",
      "tax_registration",
      "active_business",
    ]) {
      expect(REGISTRATION_STEP_AUTOMATION[key]).toBe("blocked");
      expect(stepBlockedLabel(key)).toMatch(/not available in Kebu yet/i);
    }
  });

  it("marks user-action steps honestly", () => {
    expect(REGISTRATION_STEP_AUTOMATION.documents_uploaded).toBe("user_action");
    expect(REGISTRATION_STEP_AUTOMATION.business_created).toBe("auto");
  });
});

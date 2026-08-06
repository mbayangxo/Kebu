import type { GovernmentConnector } from "../countries/types";

/**
 * PLACEHOLDER / DEV ONLY — Mock Government Connector
 * -------------------------------------------------
 * This is NOT a real government integration.
 * It returns predictable canned responses so the architecture
 * (submit / checkStatus / messages / certificate / cancel) can be plugged
 * with a live Senegal (or other) connector later without rewriting callers.
 *
 * Do not surface this as a successful government filing in production UI.
 * Government submission is out of scope for Business Registration Slice 1.
 */
export const mockGovernmentConnector: GovernmentConnector = {
  countryCode: "SN",
  isLive: false,

  async submitRegistration({ businessId }) {
    return {
      externalRef: `MOCK-GOV-${businessId.slice(0, 8).toUpperCase()}`,
      status: "mock_not_submitted",
      messages: [
        "PLACEHOLDER: Mock government connector — no real submission occurred.",
        "Replace with a live country connector when integration is authorized.",
      ],
    };
  },

  async checkStatus(externalRef) {
    return {
      status: "mock_idle",
      messages: [`PLACEHOLDER status for ${externalRef}`],
    };
  },

  async retrieveMessages(externalRef) {
    return [`PLACEHOLDER: no government messages for ${externalRef}`];
  },

  async retrieveCertificate(externalRef) {
    void externalRef;
    return { url: null, available: false };
  },

  async cancelApplication(externalRef) {
    void externalRef;
    return { cancelled: false };
  },
};

export function getGovernmentConnector(countryCode: string): GovernmentConnector {
  const cc = countryCode.trim().toUpperCase();
  // Future: return live connectors by country when authorized.
  if (cc === "SN") return mockGovernmentConnector;
  return {
    ...mockGovernmentConnector,
    countryCode: cc,
  };
}

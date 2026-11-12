export const NETWORK_NEEDS = [
  "Co-founder", "Investor", "Customers", "Supplier", "Mentor",
  "Partner", "Team member", "Diaspora connection", "Export partner",
] as const;

/** Canonical stored values — never translate the value, only its displayed label (see lib/network/network-i18n.ts). */
export const BUSINESS_STAGES = ["Idea", "Early stage", "Growing", "Established"] as const;

/** Canonical stored values — never translate the value, only its displayed label (see lib/network/network-i18n.ts). */
export const SECTORS = [
  "Agriculture", "Tech / Software", "Finance / Fintech", "Health",
  "Fashion & beauty", "Food & catering", "Construction", "Creative economy",
  "Education", "Energy", "Logistics", "Manufacturing", "Retail & e-commerce",
  "Tourism", "Trade & export",
] as const;

export type DirectoryProfile = {
  id: string; name: string; initials: string; location: string; country: string;
  sector: string; headline: string; building: string; offering: string;
  looking_for: (typeof NETWORK_NEEDS)[number][];
  stage: (typeof BUSINESS_STAGES)[number] | null;
  languages: string[];
};

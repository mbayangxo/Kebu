export const NETWORK_NEEDS = [
  "Co-founder", "Investor", "Customers", "Supplier", "Mentor",
  "Partner", "Team member", "Diaspora connection", "Export partner",
] as const;

export type DirectoryProfile = {
  id: string; name: string; initials: string; location: string; country: string;
  sector: string; headline: string; building: string; offering: string;
  looking_for: (typeof NETWORK_NEEDS)[number][];
  stage: "Idea" | "Early stage" | "Growing" | "Established" | null;
  languages: string[];
};

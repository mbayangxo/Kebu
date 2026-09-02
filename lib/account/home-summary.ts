import type { KebuPersonalizationSummary } from "@/lib/account/kebu-personalization";

export type HomeUpdate = {
  id: string;
  kind: "site" | "business" | "email" | "create" | "opportunity" | "b2b";
  title: string;
  body: string;
  href: string;
  at: string | null;
};

export type HomeBusinessRow = {
  id: string;
  publicKebuId: string;
  name: string;
  role: string;
  readinessScore: number | null;
  readinessBand: string | null;
};

export type HomeSiteRow = {
  id: string;
  title: string;
  status: string;
  projectType: string;
  subdomain: string | null;
  productCount: number;
};

export type HomeSummary = {
  profile: {
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    afriqueId: string | null;
  };
  stats: {
    sitesTotal: number;
    sitesPublished: number;
    storeProducts: number;
    emailSubscribers: number;
    createDesigns: number;
    countriesLive: number;
  };
  businesses: HomeBusinessRow[];
  sites: HomeSiteRow[];
  email: {
    subscribers: number;
    draftCampaigns: number;
    lastCampaignSubject: string | null;
  };
  opportunities: {
    count: number;
    exploreHref: string;
  };
  personalization: KebuPersonalizationSummary;
  updates: HomeUpdate[];
};

/**
 * Which owner-portal modules to emphasize by business category.
 * Same Kebu infrastructure — different surfaces. Never show empty shells.
 */

export type PortalModuleId =
  | "registration"
  | "websites"
  | "shop"
  | "events"
  | "invoices"
  | "contracts"
  | "launch"
  | "email"
  | "analytics"
  | "team"
  | "press"
  | "artist_campaigns"
  | "artist_media";

export type PortalModule = {
  id: PortalModuleId;
  label: string;
  why: string;
};

const CORE: PortalModule[] = [
  { id: "registration", label: "Registration", why: "Kebu ID prep and documents." },
  { id: "websites", label: "Websites", why: "Builder sites linked to this business." },
  { id: "team", label: "Team", why: "Invite managers and creatives with real roles." },
  { id: "email", label: "Email campaigns", why: "List + send when Resend is configured." },
  { id: "launch", label: "Launch plan", why: "Popup strategy + checklist before go-live." },
];

const AGENCY_EXTRA: PortalModule[] = [
  { id: "press", label: "Artists · Press", why: "Roster + structured public press kits." },
  {
    id: "artist_campaigns",
    label: "Artist campaigns",
    why: "Release / promo plans tied to artists and press kits.",
  },
  {
    id: "artist_media",
    label: "Reels · MVs",
    why: "Publish reel and music-video links on the artist public page.",
  },
  { id: "events", label: "Events", why: "RSVP / tickets for shows and seeding nights." },
  { id: "invoices", label: "Invoices", why: "Bill brands, venues, and partners." },
  { id: "contracts", label: "Contracts", why: "Send talent and vendor agreements." },
];

const SHOP_EXTRA: PortalModule[] = [
  { id: "shop", label: "Shop", why: "Products, orders, JOKO pay, shop analytics." },
  { id: "invoices", label: "Invoices", why: "B2B or wholesale invoices when needed." },
  { id: "analytics", label: "Analytics", why: "Order and visit patterns." },
];

/** Map Kebu business category → portal emphasis. Add modules as you need them. */
export function portalModulesForCategory(category: string | null | undefined): PortalModule[] {
  const c = (category || "other").toLowerCase();
  const shopish = ["retail", "fashion", "beauty", "food", "agriculture", "manufacturing"].includes(c);
  const agencyish = ["services", "technology", "education", "tourism", "other", "health"].includes(c);

  const out = [...CORE];
  if (shopish) {
    for (const m of SHOP_EXTRA) {
      if (!out.some((x) => x.id === m.id)) out.push(m);
    }
  }
  if (agencyish || !shopish) {
    for (const m of AGENCY_EXTRA) {
      if (!out.some((x) => x.id === m.id)) out.push(m);
    }
  }
  if (shopish && !out.some((x) => x.id === "events")) {
    out.push({
      id: "events",
      label: "Events",
      why: "Pop-up shops and launch nights.",
    });
  }
  return out;
}

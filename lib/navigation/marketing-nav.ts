/** Public marketing site — header & footer links (landing + company pages). */

export const KEBU_MARKETING_NAV = [
  { label: "Products", href: "/products" },
  { label: "Sites", href: "/create" },
  { label: "Studio", href: "/studio" },
  { label: "Business", href: "/business" },
  { label: "Opportunities", href: "/opportunity" },
  { label: "Pricing", href: "/pricing" },
] as const;

export const KEBU_MARKETING_FOOTER = [
  { label: "Support", href: "/support" },
  { label: "Work for us", href: "/work-with-us" },
  { label: "Help center", href: "/help" },
  { label: "Privacy", href: "/privacy" },
  { label: "FAQs", href: "/faqs" },
  { label: "Terms", href: "/terms" },
] as const;

export const KEBU_SUPPORT_EMAIL = "support@kebu.africa";

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const marketing = [
    "/products",
    "/pricing",
    "/about",
    "/contact",
    "/create/aesthetics",
    "/templates",
    "/kebu-icon",
    "/support",
    "/work-with-us",
    "/help",
    "/privacy",
    "/faqs",
    "/terms",
    "/for-schools",
    "/for-organizations",
    "/for-enterprise",
  ];
  return marketing.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

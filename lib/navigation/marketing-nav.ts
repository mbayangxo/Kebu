/** Public marketing site — header & footer links (landing + company pages). */

export const KEBU_MARKETING_NAV = [
  { label: "Pricing", href: "/pricing" },
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
  { label: "Templates", href: "/templates" },
  { label: "Kebu Icon", href: "/kebu-icon" },
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
    "/pricing",
    "/about",
    "/contact",
    "/templates",
    "/kebu-icon",
    "/support",
    "/work-with-us",
    "/help",
    "/privacy",
    "/faqs",
    "/terms",
  ];
  return marketing.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

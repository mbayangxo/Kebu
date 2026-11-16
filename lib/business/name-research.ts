/** These are official research entry points, not an automatic clearance service. */
export const nameResearchSources = [
  {
    name: "WIPO Global Brand Database",
    url: "https://www.wipo.int/en/web/global-brand-database/index",
    scope:
      "Participating national, regional and international collections; check current coverage.",
  },
  {
    name: "OAPI prior-rights research",
    url: "https://oapi.int/proteger-la-pi/recherche-danteriorite/",
    scope:
      "OAPI marks and trade names; official similarity searches may have fees.",
  },
  {
    name: "ARIPO trademarks",
    url: "https://www.aripo.org/public/ip-services/trademarks",
    scope:
      "Banjul Protocol contracting states; not every ARIPO member or African country.",
  },
  {
    name: "National and regional office directory",
    url: "https://www.wipo.int/en/web/amc/trademark/index",
    scope:
      "Check the national or regional register for each target market and relevant goods/services.",
  },
] as const;
export function businessNamePattern(name: string) {
  return `%${name
    .normalize("NFKC")
    .trim()
    .replace(/[\\%_]/g, "\\$&")}%`;
}

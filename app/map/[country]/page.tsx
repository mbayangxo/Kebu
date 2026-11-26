import { redirect } from "next/navigation";

type Params = { params: Promise<{ country: string }> };

/**
 * /map/<country> has no real per-country geo data to render (no country
 * centroid/boundary dataset exists) — faking one would violate the "no
 * fake functionality" rule, so this keeps forwarding to the real
 * country-level product, Opportunity OS Country Explorer. /map itself
 * (no country segment) is the real interactive navigation map.
 */
export default async function LegacyMapCountryPage({ params }: Params) {
  const { country } = await params;
  const code = country.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) {
    redirect("/opportunity/countries");
  }
  redirect(`/opportunity/countries/${code}`);
}

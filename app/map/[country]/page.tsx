import { redirect } from "next/navigation";

type Params = { params: Promise<{ country: string }> };

/** Legacy per-country map — redirect to Opportunity OS Country Explorer */
export default async function LegacyMapCountryPage({ params }: Params) {
  const { country } = await params;
  const code = country.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) {
    redirect("/opportunity/countries");
  }
  redirect(`/opportunity/countries/${code}`);
}

import { redirect } from "next/navigation";

type Params = { params: Promise<{ country: string }> };

/** Legacy per-country map — redirect to Opportunity OS */
export default async function LegacyMapCountryPage({ params }: Params) {
  const { country: _country } = await params;
  redirect("/opportunity");
}

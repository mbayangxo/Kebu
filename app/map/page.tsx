import { redirect } from "next/navigation";

/** Legacy map — redirects to Opportunity OS */
export default function MapPage() {
  redirect("/opportunity");
}

import { redirect } from "next/navigation";

export const metadata = {
  title: "Aesthetic Gallery — Kebu",
  description: "Browse site aesthetics by category — distinct looks, not copy-paste templates.",
};

/** Legacy /templates URL → Aesthetic Gallery. */
export default function MarketingTemplatesPage() {
  redirect("/create/aesthetics");
}

import { redirect } from "next/navigation";

/** Legacy Alkebulan store dashboard → Kebu Shop (separate from website builder). */
export default function LegacyStoreDashboardRedirect() {
  redirect("/shop");
}

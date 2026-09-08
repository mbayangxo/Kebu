import { redirect } from "next/navigation";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

/** Legacy URL — sites live at /my-sites, not under /create. */
export default function CreateSitesRedirect() {
  redirect(MY_SITES_HREF);
}

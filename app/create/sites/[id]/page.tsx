import { redirect } from "next/navigation";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

type Props = { params: Promise<{ id: string }> };

/** Legacy URL — site detail lives at /my-sites/[id]. */
export default async function CreateSiteDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`${MY_SITES_HREF}/${id}`);
}

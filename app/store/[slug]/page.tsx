import { redirect } from "next/navigation";

type Params = { params: Promise<{ slug: string }> };

/**
 * Legacy store path. Public sites are now served at /sites/[subdomain].
 * Permanently redirect so old links still work.
 */
export default async function LegacyStoreSlugRedirect({ params }: Params) {
  const { slug } = await params;
  redirect(`/sites/${slug}`);
}

import { isPublicSite } from "@/lib/create/site-visibility-access";
import { notFound } from "next/navigation";
import { PublicSiteCommunity } from "@/app/components/create/public-site-community";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { createServiceClient } from "@/lib/opportunity/admin";
import { storeSlug } from "@/lib/kebu-code/storefront";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palaver · Kebu", robots: { index: false, follow: false } };

export default async function PalaverPage() {
  const slug = storeSlug.safeParse(process.env.KEBU_PALAVER_PILOT_SITE);
  if (!slug.success || !(await isPublicSite(slug.data))) notFound();
  const live = await loadPublicDeployment(slug.data);
  const service = createServiceClient();
  if (!service || !live || live.billingSuspended !== false) notFound();
  const project = await service.from("projects").select("site_password_enabled")
    .eq("id", live.projectId).maybeSingle();
  if (project.error || project.data?.site_password_enabled !== false) notFound();

  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
    <header className="space-y-2 border-b pb-5">
      <p className="text-xs font-semibold uppercase tracking-widest">Kebu community pilot · Senegal</p>
      <h1 className="text-4xl font-bold">Palaver</h1>
      <p>Talk about what’s happening where you live. Share a story, ask a question, or add what you know.</p>
    </header>
    <PublicSiteCommunity subdomain={slug.data} heading="The conversation"
      subheading="Write in the language you’re comfortable with. Share firsthand context and respect other members."
      signInPrompt="Sign in with your Kebu account to read, post, or reply." />
  </main>;
}

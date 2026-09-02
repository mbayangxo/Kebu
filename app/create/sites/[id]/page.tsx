import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { SiteDomainSeoPanel } from "@/app/components/create/site-domain-seo-panel";
import { SiteDetailInsights } from "@/app/components/create/site-detail-insights";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SiteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="Site detail">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="mb-4">Sign in to see analytics and settings for this site.</p>
          <Link href={`/login?next=/create/sites/${id}`} className="font-bold underline" style={{ color: KEBU.orange }}>
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, owner_id, subdomain")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return (
      <AppShell title="Site not found">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="mb-4">This site does not exist or is not yours.</p>
          <Link href="/create/sites" className="font-bold underline" style={{ color: KEBU.orange }}>
            Back to My sites
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={project.title ?? "Site detail"}>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs">
          <Link href="/create/sites" className="font-semibold underline" style={{ color: KEBU.orange }}>
            ← All sites
          </Link>
        </p>

        <SiteDetailInsights
          projectId={project.id}
          title={project.title ?? "Site"}
          subdomain={project.subdomain}
        />

        <section
          id="domain"
          className="rounded-2xl bg-white p-4 sm:p-6"
          style={{ border: `1px solid ${KEBU.border}` }}
        >
          <h2
            className="mb-4 text-lg font-bold"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Domain &amp; SEO
          </h2>
          <SiteDomainSeoPanel projectId={project.id} />
        </section>
      </div>
    </AppShell>
  );
}

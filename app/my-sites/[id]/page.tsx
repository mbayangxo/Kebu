import { createClient } from "@/lib/supabase/server";
import { SiteDomainSeoPanel } from "@/app/components/create/site-domain-seo-panel";
import { SiteDetailInsights } from "@/app/components/create/site-detail-insights";
import { SiteMerchantHub } from "@/app/components/create/site-merchant-hub";
import { SiteThemesPanel } from "@/app/components/create/site-themes-panel";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { SiteWorldShell } from "@/app/components/create/site-world-shell";
import { liveSiteUrl } from "@/lib/create/site-urls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const PANEL =
  "rounded-lg bg-white p-5 sm:p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] border border-[#E3E3E3]";

export default async function SiteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F1ED] px-6 py-16 text-center">
        <p className="mb-4">Sign in to see analytics and settings for this site.</p>
        <Link href={`/login?next=${MY_SITES_HREF}/${id}`} className="font-bold underline" style={{ color: KEBU.orange }}>
          Sign in
        </Link>
      </div>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, owner_id, subdomain, status, business_id, seo")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return (
      <div className="min-h-screen bg-[#F3F1ED] px-6 py-16 text-center">
        <p className="mb-4">This site does not exist or is not yours.</p>
        <Link href={MY_SITES_HREF} className="font-bold underline" style={{ color: KEBU.orange }}>
          Back to My sites
        </Link>
      </div>
    );
  }

  const { projectShopOpened } = await import("@/lib/create/site-shop");
  const shopOpened = projectShopOpened(project.seo);

  const liveHref = liveSiteUrl(project.subdomain);

  return (
    <SiteWorldShell
      title={project.title ?? "Site"}
      backHref={MY_SITES_HREF}
      liveHref={liveHref}
      editorHref={`/create/${project.id}`}
    >
      <SiteMerchantHub
        projectId={project.id}
        businessId={project.business_id}
        published={project.status === "published"}
        siteTitle={project.title ?? "Site"}
        shopOpened={shopOpened}
      >
        <div id="traffic" className={PANEL}>
          <SiteDetailInsights
            projectId={project.id}
            title={project.title ?? "Site"}
            subdomain={project.subdomain}
          />
        </div>

        <section id="templates" className={PANEL}>
          <SiteThemesPanel projectId={project.id} />
        </section>

        <section id="domain" className={PANEL}>
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: KEBU.black, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
          >
            Domain &amp; SEO
          </h2>
          <SiteDomainSeoPanel projectId={project.id} />
        </section>
      </SiteMerchantHub>
    </SiteWorldShell>
  );
}

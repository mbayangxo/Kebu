import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { SiteMerchantHub } from "@/app/components/create/site-merchant-hub";
import { SiteThemesPanel } from "@/app/components/create/site-themes-panel";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** Online Store → Themes — per-business theme library (Shopify Current theme layout). */
export default async function ProjectThemesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="Themes">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="mb-4">Sign in to manage themes for this site.</p>
          <Link href={`/login?next=/create/${id}/themes`} className="font-bold underline" style={{ color: KEBU.orange }}>
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, owner_id, status, business_id, seo")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return (
      <AppShell title="Themes">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="mb-4">This site does not exist or is not yours.</p>
          <Link href={MY_SITES_HREF} className="font-bold underline" style={{ color: KEBU.orange }}>
            Back to My sites
          </Link>
        </div>
      </AppShell>
    );
  }

  const { projectShopOpened } = await import("@/lib/create/site-shop");
  const shopOpened = projectShopOpened(project.seo);

  return (
    <AppShell title="Online Store · Themes">
      <SiteMerchantHub
        projectId={project.id}
        businessId={project.business_id}
        published={project.status === "published"}
        siteTitle={project.title ?? "Site"}
        shopOpened={shopOpened}
      >
        <div className="rounded-xl border border-[#E3E3E3] bg-white p-5 sm:p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: KEBU.muted }}>
                Online Store
              </p>
              <h1
                className="mt-1 text-xl font-semibold tracking-tight"
                style={{ color: KEBU.black, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
              >
                Themes
              </h1>
            </div>
            <Link
              href="/create/aesthetics"
              className="rounded-lg px-3 py-2 text-[11px] font-bold"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
            >
              Discover themes · $5
            </Link>
          </div>
          <SiteThemesPanel projectId={project.id} />
        </div>
      </SiteMerchantHub>
    </AppShell>
  );
}

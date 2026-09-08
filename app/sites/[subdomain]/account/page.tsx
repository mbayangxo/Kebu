import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { SiteBillingSuspendedView } from "@/app/components/create/site-billing-suspended";
import { PublicShopAccount } from "@/app/components/create/public-shop-account";
import { definitionHasShop } from "@/lib/create/site-shop";

type Params = { params: Promise<{ subdomain: string }> };

export default async function PublicShopAccountPage({ params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) notFound();

  if (deployment.billingSuspended) {
    return <SiteBillingSuspendedView subdomain={deployment.subdomain} projectId={deployment.projectId} />;
  }

  if (!definitionHasShop(deployment.definition)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2]">
      <PublicShopAccount subdomain={deployment.subdomain} siteTitle={deployment.definition.title} />
    </main>
  );
}

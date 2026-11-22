import { headers } from "next/headers";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { projectShopOpened } from "@/lib/create/site-shop";
import { checkoutApprovalKey, checkoutItems, matchesCheckoutApproval, verifyCheckoutApproval } from "@/lib/kebu-code/checkout-approval";
import { createServiceClient } from "@/lib/opportunity/admin";
import { resolveCartLines } from "@/lib/shop/cart-order";
import { HostedCartReview } from "./review";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review order · Kebu Shop", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CheckoutReview({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const unavailable = (message: string) => <main className="mx-auto max-w-xl p-6"><h1>Checkout unavailable</h1><p>{message}</p></main>;
  const key = checkoutApprovalKey();
  const { approval, items } = await searchParams;
  if (!key || typeof approval !== "string") return unavailable("Ask the store for an active checkout link.");
  const approved = verifyCheckoutApproval(approval, key);
  if (!approved) return unavailable("This checkout link has expired or is invalid.");
  if (typeof items !== "string" || items.length > 2400) return unavailable("Choose items in the app before opening checkout.");
  const raw = (() => { try { return JSON.parse(items) as unknown; } catch { return null; } })();
  const parsed = checkoutItems.safeParse(raw);
  if (!parsed.success) return unavailable("The app did not send a valid item selection.");
  const limited = shopOrderRateLimit(new Request("https://kebu.invalid", { headers: await headers() }));
  if (limited) return unavailable("Too many attempts. Try again shortly.");
  const db = createServiceClient();
  if (!db) return unavailable("Checkout is temporarily unavailable.");
  const [workspace, store] = await Promise.all([
    db.from("kebu_code_workspaces").select("owner_id,store_project_id,revision").eq("id",approved.app).maybeSingle(),
    db.from("projects").select("id,owner_id,project_type,site_password_enabled").eq("id",approved.store).maybeSingle(),
  ]);
  if (!workspace.data || !store.data || workspace.error || store.error || !matchesCheckoutApproval(approved, workspace.data, store.data)) {
    return unavailable("The store no longer authorizes this checkout link.");
  }
  const deployment = await db.from("deployments").select("subdomain").eq("project_id",approved.store).eq("status","live")
    .order("published_at",{ascending:false}).limit(1).maybeSingle();
  if (deployment.error || !deployment.data) return unavailable("The store is not published.");
  const live = await loadPublicDeployment(deployment.data.subdomain);
  if (!live || live.projectId !== approved.store || live.billingSuspended !== false || !projectShopOpened(live.seo)) {
    return unavailable("The store is not accepting checkout links.");
  }

  const published = new Set<string>();
  for (const page of live.definition.pages) for (const section of page.sections) {
    if (section.type !== "products") continue;
    const props = sectionPropsSchemas.products.safeParse(section.props);
    if (props.success) for (const item of props.data.items) {
      if (item.productId && !item.isSubscription) published.add(item.productId);
    }
  }
  if (parsed.data.some(item => !published.has(item.productId))) return unavailable("An item is not available on the published store.");

  const resolved = await resolveCartLines(db, approved.store, parsed.data);
  if (!resolved.ok) return unavailable(resolved.error);
  const quantities = new Map<string,number>();
  for (const line of resolved.lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  const variants = resolved.lines.flatMap(line => line.variantId ? [line.variantId] : []);
  const [products, stock] = await Promise.all([
    db.from("project_products").select("id,track_stock,stock_qty,is_subscription").eq("project_id",approved.store)
      .eq("is_active",true).in("id",[...quantities.keys()]),
    variants.length ? db.from("project_product_variants").select("id,stock_qty").eq("project_id",approved.store)
      .eq("is_active",true).in("id",variants) : Promise.resolve({ data: [], error: null }),
  ]);
  if (products.error || stock.error || products.data?.length !== quantities.size || stock.data?.length !== variants.length ||
      products.data.some(product => product.is_subscription || (product.track_stock && (product.stock_qty ?? 0) < quantities.get(product.id)!)) ||
      resolved.lines.some(line => line.variantId && stock.data?.some(variant => variant.id === line.variantId && variant.stock_qty !== null && variant.stock_qty < line.quantity))) {
    return unavailable("An item is unavailable or requires a different checkout method.");
  }
  return <HostedCartReview subdomain={live.subdomain} storeName={live.definition.title}
    commerce={mergeSiteCommerce(live.seo.commerce)} lines={resolved.lines.map(line => ({
      productId:line.productId, variantId:line.variantId, variantName:line.variantName ?? undefined,
      productName:line.productName, priceLabel:line.priceLabel, quantity:line.quantity,
    }))} />;
}

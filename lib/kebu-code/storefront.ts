import { shopProductAnchor } from "@/lib/create/shop-product-anchor";
import { shopSelectionMax, shopSelectionQuantity } from "@/lib/create/shop-selection";
import { z } from "zod";

export const storeSlug = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const storefrontSchema = z.strictObject({
  subdomain: storeSlug,
  products: z.array(z.strictObject({ id: z.uuid(), name: z.string().trim().min(1).max(120) })).max(100).optional(),
  url: z.url().refine(value => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password &&
      !url.search && !url.hash && /^\/sites\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(url.pathname);
  }),
}).refine(value => {
  const [, , slug] = new URL(value.url).pathname.split("/");
  return slug === value.subdomain;
});
export type Storefront = z.infer<typeof storefrontSchema>;

export function storefrontLink(store: Storefront): string {
  const { url } = storefrontSchema.parse(store);
  // Validation restricts the path; escape the complete attribute regardless.
  const href = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<a href="${href}">Shop on Kebu</a>`;
}

/** Product links can only target a product verified on the selected public page. */
export function storefrontProductUrl(store: Storefront, productId: string): string {
  const parsed = storefrontSchema.parse(store);
  const anchor = shopProductAnchor(productId);
  if (!anchor || !parsed.products?.some(product => product.id === productId)) {
    throw new Error("That product is not on this storefront page.");
  }
  const url = new URL(parsed.url);
  url.hash = anchor;
  return url.href;
}

export function storefrontProductLink(store: Storefront, productId: string): string {
  const url = storefrontProductUrl(store, productId);
  const name = store.products!.find(product => product.id === productId)!.name;
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<a href="${escape(url)}">Shop ${escape(name)}</a>`;
}

/** Publish a plain browser handoff; no credentials, amount, or order data in the URL. */
export function storefrontSelectionUrl(store: Storefront, productId: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > shopSelectionMax) {
    throw new Error("Quantity must be between 1 and 20.");
  }
  const url = new URL(storefrontProductUrl(store, productId));
  url.searchParams.set(shopSelectionQuantity, String(quantity));
  return url.href;
}

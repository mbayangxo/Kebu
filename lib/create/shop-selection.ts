import { shopProductAnchor } from "./shop-product-anchor";

export const shopSelectionQuantity = "kebu_qty";
export const shopSelectionMax = 20;

/** A URL may suggest a quantity for the exact product it targets, nothing else. */
export function readShopSelection(url: URL, productId: string): number | null {
  const anchor = shopProductAnchor(productId);
  const values = url.searchParams.getAll(shopSelectionQuantity);
  if (!anchor || url.hash !== "#" + anchor || values.length !== 1 || !/^(?:[1-9]|1[0-9]|20)$/.test(values[0])) return null;
  return Number(values[0]);
}

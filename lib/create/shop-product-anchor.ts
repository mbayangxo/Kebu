/** Shared by public product cards and exported storefront links. */
export function shopProductAnchor(productId: string | null | undefined) {
  return typeof productId === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(productId)
    ? "product-" + productId.toLowerCase()
    : undefined;
}

"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { readShopSelection, shopSelectionMax, shopSelectionQuantity } from "@/lib/create/shop-selection";
import { addToShopCart, cartLineKey, readShopCart } from "@/lib/create/shop-cart-storage";
import { dispatchCartChanged } from "@/app/components/create/public-shop-cart";
import { shopProductAnchor } from "@/lib/create/shop-product-anchor";
import { PublicShopOrder } from "@/app/components/create/public-shop-order";
import { PublicShopSubscribe } from "@/app/components/create/public-shop-subscribe";
import { PublicShopWishlistButton } from "@/app/components/create/public-shop-wishlist-button";
import {
  PublicProductVariantPicker,
  type ProductVariantOption,
} from "@/app/components/create/public-product-variant-picker";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import type { ShopOrderFormStyle } from "@/app/components/create/public-shop-order";

function observeLocation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  window.addEventListener("kebu-selection-consumed", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
    window.removeEventListener("kebu-selection-consumed", listener);
  };
}

export function PublicProductActions({
  subdomain,
  productId,
  productName,
  priceLabel,
  variants,
  commerce,
  orderStyle,
  ctaLabel,
  isSubscription,
  subscriptionInterval,
}: {
  subdomain: string;
  productId: string;
  productName: string;
  priceLabel: string;
  variants?: ProductVariantOption[];
  commerce?: SiteCommerce | null;
  orderStyle?: ShopOrderFormStyle;
  ctaLabel?: string;
  isSubscription?: boolean;
  subscriptionInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
}) {
  const hasVariants = Boolean(variants?.length);
  const [selection, setSelection] = useState<{
    variantId?: string;
    variantName?: string;
    priceLabel: string;
  }>({ priceLabel });

  const onVariantChange = useCallback(
    (v: { variantId: string; variantName: string; priceLabel: string }) => {
      setSelection(v);
    },
    [],
  );

  const [selectionNotice, setSelectionNotice] = useState("");
  const [consumedUrl, setConsumedUrl] = useState("");
  const href = useSyncExternalStore(observeLocation, () => window.location.href, () => "");
  const proposedQuantity = !isSubscription && href && href !== consumedUrl
    ? readShopSelection(new URL(href), productId) : null;

  const displayName =
    selection.variantName ? `${productName} (${selection.variantName})` : productName;
  const displayPrice = selection.priceLabel || priceLabel;

  const anchor = <span id={shopProductAnchor(productId)} className="absolute scroll-mt-32" aria-hidden="true" />;

  if (isSubscription) {
    return (
      <>
        {anchor}
        <PublicShopSubscribe
          subdomain={subdomain}
          productId={productId}
          productName={productName}
          priceLabel={priceLabel}
          interval={subscriptionInterval ?? "monthly"}
        />
        <PublicShopWishlistButton subdomain={subdomain} productId={productId} productName={productName} />
      </>
    );
  }

  return (
    <>
      {anchor}
      {hasVariants && variants ? (
        <PublicProductVariantPicker
          variants={variants}
          defaultPriceLabel={priceLabel}
          onChange={onVariantChange}
        />
      ) : null}
      {proposedQuantity !== null && <div className="w-full rounded-lg border p-3 text-sm">
        <p>Requested: {proposedQuantity} × {productName}. Review the options before adding to your cart.</p>
        <button type="button" className="kebu-cta mt-2 rounded-full px-4 py-2 text-xs font-bold"
          disabled={hasVariants && !selection.variantId}
          onClick={() => {
            if (window.location.href !== href) return;
            const line = { productId, variantId: selection.variantId, variantName: selection.variantName,
              productName: displayName, priceLabel: displayPrice, quantity: proposedQuantity };
            const key = cartLineKey(line);
            const current = readShopCart(subdomain).find(item => cartLineKey(item) === key)?.quantity ?? 0;
            if (current + proposedQuantity > shopSelectionMax) {
              setSelectionNotice("Your cart can hold up to 20 of this option. Adjust the quantity in your cart first.");
              return;
            }
            addToShopCart(subdomain, line);
            const saved = readShopCart(subdomain).find(item => cartLineKey(item) === key)?.quantity;
            if (saved !== current + proposedQuantity) {
              setSelectionNotice("Could not save your cart. Check that browser storage is available.");
              return;
            }
            dispatchCartChanged();
            setConsumedUrl(href);
            setSelectionNotice("Added to your cart. Open the cart to review and check out.");
            const clean = new URL(href);
            clean.searchParams.delete(shopSelectionQuantity);
            window.history.replaceState(window.history.state, "", clean);
            window.dispatchEvent(new Event("kebu-selection-consumed"));
          }}>Add requested quantity to cart</button>
        {hasVariants && !selection.variantId && <p>Select an option first.</p>}
      </div>}
      {selectionNotice && <p className="w-full text-sm" role="status">{selectionNotice}</p>}
      <PublicShopOrder
        subdomain={subdomain}
        productId={productId}
        variantId={selection.variantId}
        variantName={selection.variantName}
        productName={displayName}
        productPrice={displayPrice}
        commerce={commerce}
        orderStyle={orderStyle}
        ctaLabel={ctaLabel}
      />
      <PublicShopWishlistButton subdomain={subdomain} productId={productId} productName={productName} />
    </>
  );
}

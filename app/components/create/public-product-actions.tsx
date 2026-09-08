"use client";

import { useCallback, useState } from "react";
import { PublicShopOrder } from "@/app/components/create/public-shop-order";
import { PublicShopSubscribe } from "@/app/components/create/public-shop-subscribe";
import { PublicShopWishlistButton } from "@/app/components/create/public-shop-wishlist-button";
import {
  PublicProductVariantPicker,
  type ProductVariantOption,
} from "@/app/components/create/public-product-variant-picker";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import type { ShopOrderFormStyle } from "@/app/components/create/public-shop-order";

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

  const displayName =
    selection.variantName ? `${productName} (${selection.variantName})` : productName;
  const displayPrice = selection.priceLabel || priceLabel;

  if (isSubscription) {
    return (
      <>
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
      {hasVariants && variants ? (
        <PublicProductVariantPicker
          variants={variants}
          defaultPriceLabel={priceLabel}
          onChange={onVariantChange}
        />
      ) : null}
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

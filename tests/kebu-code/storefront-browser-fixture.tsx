import React from "react";
import { createRoot } from "react-dom/client";
import { HostedCartReview } from "@/app/code/shop-checkout/review";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import Workspace from "@/app/code/workspace";
import { PublicProductActions } from "@/app/components/create/public-product-actions";

Object.assign(window, { React });
const query = new URL(location.href).searchParams;
createRoot(document.getElementById("root")!).render(query.has("review") ?
  <HostedCartReview subdomain="test-store" storeName="Test Shop" commerce={mergeSiteCommerce(null)}
    lines={[{productId:"44444444-4444-4444-8444-444444444444",productName:"Ginger tea",priceLabel:"1200 FCFA",quantity:2}]} /> :
  query.has("shop") ?
  <PublicProductActions subdomain="test-store" productId="44444444-4444-4444-8444-444444444444"
    productName="Ginger tea" priceLabel="1200 FCFA" /> : <Workspace />);

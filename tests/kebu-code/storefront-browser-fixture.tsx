import React from "react";
import { createRoot } from "react-dom/client";
import Workspace from "@/app/code/workspace";
import { PublicProductActions } from "@/app/components/create/public-product-actions";

Object.assign(window, { React });
const shop = new URL(location.href).searchParams.has("shop");
createRoot(document.getElementById("root")!).render(shop ?
  <PublicProductActions subdomain="test-store" productId="44444444-4444-4444-8444-444444444444"
    productName="Ginger tea" priceLabel="1200 FCFA" /> : <Workspace />);

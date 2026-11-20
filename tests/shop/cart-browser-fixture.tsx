/** Local acceptance harness. Never mounted by the application. */
import React from "react";
import { createRoot } from "react-dom/client";
import { PublicShopCart } from "@/app/components/create/public-shop-cart";
import { DataModeProvider } from "@/app/components/create/data-mode-provider";
import "@/app/components/create/kebu-site-responsive.css";

Object.assign(window, { React });
createRoot(document.getElementById("root")!).render(
  <DataModeProvider><PublicShopCart subdomain="store" /></DataModeProvider>,
);

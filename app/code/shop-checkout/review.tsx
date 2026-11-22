"use client";

import "@/app/components/create/kebu-site-responsive.css";
import { useState } from "react";
import { DataModeProvider } from "@/app/components/create/data-mode-provider";
import { PublicShopCart, dispatchCartChanged } from "@/app/components/create/public-shop-cart";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import { cartLineKey, readShopCart, writeShopCart, type ShopCartLine } from "@/lib/create/shop-cart-storage";

export function HostedCartReview({subdomain,storeName,commerce,lines}:{
  subdomain:string;storeName:string;commerce:SiteCommerce;lines:ShopCartLine[];
}) {
  const [continued,setContinued]=useState(false);
  const [message,setMessage]=useState("");
  function confirm() {
    const merged=new Map(readShopCart(subdomain).map(line=>[cartLineKey(line),line]));
    for(const line of lines){
      const key=cartLineKey(line);
      const quantity=(merged.get(key)?.quantity??0)+line.quantity;
      if(quantity>20){setMessage("Your cart already has too many of an item. Adjust your cart first.");return;}
      merged.set(key,{...line,quantity});
    }
    if(merged.size>24){setMessage("Your cart has too many different items. Adjust your cart first.");return;}
    const combined=[...merged.values()];
    writeShopCart(subdomain,combined);
    if(JSON.stringify(readShopCart(subdomain))!==JSON.stringify(combined)){
      setMessage("Your cart could not be saved. Check that browser storage is enabled.");
      return;
    }
    setContinued(true);
    setMessage("Items added. Open your cart to review the full order and payment options.");
    dispatchCartChanged();
  }
  return <main className="mx-auto max-w-xl space-y-4 p-6">
    <h1 className="text-2xl font-semibold">Review items from {storeName}</h1>
    <p>Prices and availability are checked again when you place the order.</p>
    <ul>{lines.map(line=><li key={cartLineKey(line)}>{line.quantity} × {line.productName} — {line.priceLabel || "Price at checkout"}</li>)}</ul>
    <button type="button" className="rounded border px-4 py-2" onClick={confirm} disabled={continued}>Add these items to my cart</button>
    {message&&<p role="status">{message}</p>}
    <DataModeProvider><PublicShopCart subdomain={subdomain} commerce={commerce}/></DataModeProvider>
  </main>;
}

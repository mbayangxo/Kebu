"use client";
import { useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { brandCreativeSite } from "@/lib/create/brand-creative-sites";
/** Isolated public-render gate. Ordinary Builder persistence has a separate full-screen gate. */
export default function WorldProbe() {
  const [brand, setBrand] = useState<"kdirection" | "dklns">("dklns");
  return <><div style={{ padding: 12, background: "white", color: "black" }}><button onClick={() => setBrand("dklns")}>View DKLNS</button><button onClick={() => setBrand("kdirection")}>View K-Direction</button></div><SiteRenderer key={brand} definition={brandCreativeSite(brand)} mode="live" pageSlug="home" siteBase="/world-local-probe" /></>;
}

"use client";

import { Suspense } from "react";
import ShopAdminPage from "./shop-admin-client";

export default function ShopProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-black/50">Loading shop…</div>
      }
    >
      <ShopAdminPage />
    </Suspense>
  );
}

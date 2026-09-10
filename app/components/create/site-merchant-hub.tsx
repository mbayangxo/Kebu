"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { KebuBusinessNavTree } from "@/app/components/business/kebu-business-nav-tree";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";

const ADMIN = {
  border: "#E3E3E3",
  muted: "#616161",
  faint: "#8C8C8C",
  panel: "#FFFFFF",
} as const;

/**
 * Kebu Business — merchant OS shell for one site.
 * Shopify-style: 240px site nav + full-width main. Nav owns destinations; page owns status.
 */
export function SiteMerchantHub({
  projectId,
  businessId,
  published,
  siteTitle,
  shopOpened = false,
  /** home = calm status canvas; workspace = children only (Themes, Shop, …) */
  mode = "home",
  children,
}: {
  projectId: string;
  businessId: string | null;
  published: boolean;
  siteTitle?: string;
  shopOpened?: boolean;
  mode?: "home" | "workspace";
  children?: ReactNode;
}) {
  const router = useRouter();
  const editor = `/create/${projectId}`;
  const shop = `/shop/${projectId}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openShop() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shop/open`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not open shop.");
        return;
      }
      router.push(typeof data.shopUrl === "string" ? data.shopUrl : shop);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const nav = (
    <KebuBusinessNavTree
      projectId={projectId}
      businessId={businessId}
      published={published}
      siteTitle={siteTitle}
      shopOpened={shopOpened}
      openShopBusy={busy}
      onOpenShop={() => void openShop()}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 w-full">
      <div
        className="hidden w-[240px] shrink-0 bg-[#EBEBEB] lg:block"
        style={{ borderRight: `1px solid ${ADMIN.border}` }}
      >
        {nav}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto" style={{ background: "#F1F1F1" }}>
        <div className="w-full space-y-5 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="lg:hidden rounded-xl overflow-hidden" style={{ border: `1px solid ${ADMIN.border}` }}>
            {nav}
          </div>

          {error ? (
            <p className="text-sm" style={{ color: KEBU.red }} role="alert">
              {error}
            </p>
          ) : null}

          {mode === "home" ? (
            <div
              className="rounded-xl bg-white p-6 sm:p-8"
              style={{ border: `1px solid ${ADMIN.border}`, boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}
            >
              <p className="text-[11px] font-medium" style={{ color: ADMIN.faint }}>
                Home
              </p>
              <h2
                className="mt-1 text-2xl font-semibold tracking-tight"
                style={{ color: KEBU.black, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
              >
                {siteTitle ?? "Your site"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: ADMIN.muted }}>
                {shopOpened
                  ? "Website and shop are connected. Use the left menu for Online Store, Shop, and Analytics."
                  : "This is a website until you open a shop from the left menu. Customize and Themes live under Online Store."}{" "}
                {businessId ? (
                  <Link href={`/business/${businessId}`} className="font-medium underline" style={{ color: KEBU.black }}>
                    Business dashboard
                  </Link>
                ) : (
                  <Link href="/business?tab=businesses" className="font-medium underline" style={{ color: KEBU.black }}>
                    Link a business
                  </Link>
                )}
                .
              </p>

              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${ADMIN.border}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ADMIN.faint }}>
                  Next steps
                </p>
                <ul className="mt-3 space-y-2 text-sm" style={{ color: ADMIN.muted }}>
                  {!published ? (
                    <li>
                      <Link href={editor} className="font-medium underline" style={{ color: KEBU.black }}>
                        Publish your site
                      </Link>{" "}
                      from Online Store → Customize to start real visitor analytics.
                    </li>
                  ) : (
                    <li>
                      <Link
                        href={mySiteDetailHref(projectId) + "#traffic"}
                        className="font-medium underline"
                        style={{ color: KEBU.black }}
                      >
                        Review traffic
                      </Link>{" "}
                      below on this page.
                    </li>
                  )}
                  {shopOpened ? (
                    <li>
                      <Link href={`${shop}?tab=products`} className="font-medium underline" style={{ color: KEBU.black }}>
                        Add or update products
                      </Link>{" "}
                      in Shop — then show them on the website when ready.
                    </li>
                  ) : (
                    <li>
                      Selling? Open{" "}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void openShop()}
                        className="font-medium underline disabled:opacity-50"
                        style={{ color: KEBU.black }}
                      >
                        {busy ? "Opening shop…" : "Shop → Open shop"}
                      </button>{" "}
                      in the left menu when you are ready.
                    </li>
                  )}
                  {!businessId ? (
                    <li>
                      <Link
                        href="/business?tab=businesses"
                        className="font-medium underline"
                        style={{ color: KEBU.black }}
                      >
                        Link a Kebu ID business
                      </Link>{" "}
                      so this site sits under the right brand.
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}

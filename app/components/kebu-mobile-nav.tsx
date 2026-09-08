"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF, PRODUCT_NAV } from "@/lib/navigation/product-nav";
import { useKebuWorkspace } from "@/app/hooks/use-kebu-workspace";

const MOBILE_LINKS_BUSINESS = [
  ...PRODUCT_NAV.myKebu,
  ...PRODUCT_NAV.aesthetics,
  ...PRODUCT_NAV.shop,
  ...PRODUCT_NAV.studio,
  ...PRODUCT_NAV.alkebulan,
  ...PRODUCT_NAV.opportunity,
] as const;

const MOBILE_LINKS_KEBU = [...PRODUCT_NAV.kebu, ...PRODUCT_NAV.opportunity] as const;
const MOBILE_LINKS_STUDIO = [...PRODUCT_NAV.studio, { label: "My Sites", href: MY_SITES_HREF }] as const;

/** Compact mobile drawer — sidebar is desktop-only. */
export function KebuMobileNav() {
  const pathname = usePathname();
  const { workspace } = useKebuWorkspace();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links =
    workspace === "studio"
      ? MOBILE_LINKS_STUDIO
      : workspace === "business"
        ? MOBILE_LINKS_BUSINESS
        : MOBILE_LINKS_KEBU;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ border: "1px solid rgba(255,255,255,0.35)" }}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        Menu
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            className="fixed left-0 right-0 top-[3.25rem] z-[90] max-h-[70vh] overflow-y-auto border-b px-3 py-3"
            style={{ background: KEBU.black, borderColor: KEBU.orange }}
          >
            <ul className="space-y-1">
              {links.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-semibold"
                      style={{
                        background: active ? KEBU.orange : "transparent",
                        color: KEBU.white,
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/account"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white/80"
                >
                  My Account
                </Link>
              </li>
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}

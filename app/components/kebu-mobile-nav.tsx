"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF, PRODUCT_NAV, type NavItem } from "@/lib/navigation/product-nav";
import { useKebuWorkspace } from "@/app/hooks/use-kebu-workspace";

type MobileSection = { title: string; items: readonly NavItem[] };

const SECTIONS_BUSINESS: MobileSection[] = [
  { title: "Your Space", items: PRODUCT_NAV.myKebu },
  { title: "Build", items: PRODUCT_NAV.aesthetics },
  { title: "Commerce", items: PRODUCT_NAV.shop },
  { title: "Studio", items: PRODUCT_NAV.studio },
  { title: "Explore", items: [...PRODUCT_NAV.alkebulan, ...PRODUCT_NAV.opportunity] },
];

const SECTIONS_KEBU: MobileSection[] = [
  { title: "Your Kebu", items: PRODUCT_NAV.kebu },
  { title: "Explore", items: PRODUCT_NAV.opportunity },
];

const SECTIONS_STUDIO: MobileSection[] = [
  { title: "Studio", items: PRODUCT_NAV.studio },
  { title: "Sites", items: [{ label: "My Sites", href: MY_SITES_HREF }] },
];

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M3 7h16M3 11h16M3 15h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M5 5L17 17M5 17L17 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Compact mobile drawer — sidebar is desktop-only. */
export function KebuMobileNav() {
  const pathname = usePathname();
  const { workspace } = useKebuWorkspace();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sections =
    workspace === "studio"
      ? SECTIONS_STUDIO
      : workspace === "business"
        ? SECTIONS_BUSINESS
        : SECTIONS_KEBU;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
        style={{ background: open ? KEBU.orange : "rgba(255,255,255,0.10)" }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {open ? (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <nav
            ref={navRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed left-0 top-[3.25rem] bottom-0 z-[90] w-72 overflow-y-auto"
            style={{ background: KEBU.black, borderRight: `1px solid rgba(255,85,0,0.25)` }}
          >
            <div className="px-3 py-4 space-y-5">
              {sections.map((section) => (
                <div key={section.title}>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.22em] px-2 mb-1.5"
                    style={{ color: KEBU.orange }}
                  >
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (!item.exact && pathname.startsWith(`${item.href}/`));
                      return (
                        <li key={`${item.href}-${item.label}`}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
                            style={{
                              background: active ? KEBU.orange : "transparent",
                              color: active ? KEBU.white : "rgba(255,255,255,0.80)",
                              boxShadow: active ? "0 4px 14px rgba(255,85,0,0.30)" : "none",
                            }}
                          >
                            <span
                              className="w-1 h-3.5 rounded-full shrink-0"
                              style={{
                                background: active ? "rgba(255,255,255,0.7)" : "rgba(255,85,0,0.5)",
                              }}
                              aria-hidden
                            />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {/* Account — always last */}
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.22em] px-2 mb-1.5"
                  style={{ color: KEBU.orange }}
                >
                  Account
                </p>
                <ul>
                  <li>
                    <Link
                      href="/account"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold"
                      style={{ color: "rgba(255,255,255,0.80)" }}
                    >
                      <span
                        className="w-1 h-3.5 rounded-full shrink-0"
                        style={{ background: "rgba(255,85,0,0.5)" }}
                        aria-hidden
                      />
                      My Account
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  DataModeDock,
  DataModeProvider,
} from "@/app/components/create/data-mode-provider";
import { usePathname } from "next/navigation";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import "@/app/components/create/kebu-site-responsive.css";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/start", "/auth"];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Root Data Saver / Offline shell — available before sign-in (marketing, auth, public pages).
 * AppShell and public sites nest safely (provider reuses parent context).
 * Dock is hidden on marketing and auth pages — it only belongs in the signed-in app context.
 */
export function KebuDataModeRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideDock =
    isMarketingPath(pathname) ||
    isAuthPath(pathname) ||
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/create/") ||
    /^\/create\/[^/]+$/.test(pathname);

  return (
    <DataModeProvider>
      {children}
      {!hideDock ? <DataModeDock /> : null}
    </DataModeProvider>
  );
}

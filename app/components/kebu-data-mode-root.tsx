"use client";

import type { ReactNode } from "react";
import {
  DataModeDock,
  DataModeProvider,
} from "@/app/components/create/data-mode-provider";
import { usePathname } from "next/navigation";
import "@/app/components/create/kebu-site-responsive.css";

/**
 * Root Data Saver / Offline shell — available before sign-in (marketing, auth, public pages).
 * AppShell and public sites nest safely (provider reuses parent context).
 */
export function KebuDataModeRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideDock =
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/create/") ||
    /^\/create\/[^/]+$/.test(pathname);

  return (
    <DataModeProvider>
      {children}
      {!hideDock ? <DataModeDock /> : null}
    </DataModeProvider>
  );
}

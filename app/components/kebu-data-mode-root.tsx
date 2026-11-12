"use client";

import type { ReactNode } from "react";
import { DataModeProvider } from "@/app/components/create/data-mode-provider";
import "@/app/components/create/kebu-site-responsive.css";

/**
 * Root Data Saver / Offline shell — available before sign-in (marketing, auth, public pages).
 * AppShell and public sites nest safely (provider reuses parent context).
 * Visual mode controls are rendered by the active product shell, beside the account control.
 */
export function KebuDataModeRoot({ children }: { children: ReactNode }) {
  return <DataModeProvider>{children}</DataModeProvider>;
}

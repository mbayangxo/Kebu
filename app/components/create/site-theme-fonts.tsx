"use client";

import { useEffect } from "react";
import { googleFontsHrefForTheme } from "@/lib/create/site-theme-fonts";

const LINK_ID = "kebu-site-theme-fonts";

/** Loads Google Fonts for theme display/body so font picks actually render on public + preview. */
export function SiteThemeFonts({
  fontDisplay,
  fontBody,
  /** Ultra / Offline: skip remote font CSS to save data. */
  loadRemote = true,
}: {
  fontDisplay: string;
  fontBody: string;
  loadRemote?: boolean;
}) {
  useEffect(() => {
    const existing = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!loadRemote) {
      existing?.remove();
      return;
    }
    const href = googleFontsHrefForTheme(fontDisplay, fontBody);
    if (!href) {
      existing?.remove();
      return;
    }
    if (existing) {
      if (existing.href !== href) existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [fontDisplay, fontBody, loadRemote]);

  return null;
}

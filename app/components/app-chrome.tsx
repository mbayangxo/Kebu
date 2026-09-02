"use client";

import { usePathname } from "next/navigation";
import { LanguageBar } from "@/app/components/language-bar";
import { MobileBottomNav } from "@/app/components/mobile-nav";
import { FloatingActionItem, FloatingActionStack } from "@/app/components/floating-action-stack";
import { LearnFab, useEducation } from "@/app/components/education-system";
import { YandeGlobalFab } from "@/app/components/yande-global-fab";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import type { LanguageBarVariant } from "@/app/components/language-bar";

function languageBarVariant(pathname: string): LanguageBarVariant {
  if (pathname.startsWith("/opportunity")) return "opportunity";
  return "builder";
}

function shouldHideFloatingActions(pathname: string): boolean {
  return (
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname === "/dashboard" ||
    pathname === "/account" ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/create/sites") ||
    pathname.startsWith("/create/domains") ||
    pathname.startsWith("/opportunity") ||
    pathname === "/b2b" ||
    pathname.startsWith("/studio") ||
    pathname === "/welcome"
  );
}

function usesAppShellLayout(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname === "/account" ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/create/sites") ||
    pathname.startsWith("/create/domains") ||
    pathname.startsWith("/opportunity") ||
    pathname === "/b2b" ||
    pathname.startsWith("/studio") ||
    pathname === "/welcome" ||
    pathname.startsWith("/id/")
  );
}

/** Hide legacy app chrome on the marketing landing so only Kebu hero nav shows. */
export function AppChrome() {
  const pathname = usePathname();
  const { showRandomForPage } = useEducation();

  if (pathname === "/" || isMarketingPath(pathname)) {
    return (
      <>
        <MobileBottomNav />
        <YandeGlobalFab />
      </>
    );
  }
  const hideFloatingActions = shouldHideFloatingActions(pathname);
  const pageSlug = pathname.split("/")[1] || "home";
  const shellLayout = usesAppShellLayout(pathname);
  const inSiteEditor = /^\/create\/[^/]+$/.test(pathname);

  return (
    <>
      {!shellLayout ? <LanguageBar variant={languageBarVariant(pathname)} /> : null}
      {!hideFloatingActions ? (
        <FloatingActionStack>
          <FloatingActionItem>
            <YandeGlobalFab variant="stacked" projectId={inSiteEditor ? pathname.split("/")[2] : undefined} />
          </FloatingActionItem>
          <FloatingActionItem>
            <LearnFab onClick={() => showRandomForPage(pageSlug)} />
          </FloatingActionItem>
        </FloatingActionStack>
      ) : (
        <YandeGlobalFab />
      )}
      <MobileBottomNav />
    </>
  );
}

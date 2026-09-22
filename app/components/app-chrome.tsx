"use client";

import { usePathname } from "next/navigation";
import { FloatingActionItem, FloatingActionStack } from "@/app/components/floating-action-stack";
import { LearnFab, useEducation } from "@/app/components/education-system";
import { YandeGlobalFab } from "@/app/components/yande-global-fab";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

function shouldHideFloatingActions(pathname: string): boolean {
  return (
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/email") ||
    pathname.startsWith("/browser") ||
    pathname.startsWith("/create/") ||
    pathname === "/welcome"
  );
}

/**
 * Global chrome is intentionally minimal.
 * Signed-in product navigation lives in AppShell/KebuNavShell.
 * The old language bar + second mobile navigation were removed because
 * they duplicated the product shell and made every world vertically cramped.
 */
export function AppChrome() {
  const pathname = usePathname();
  const { showRandomForPage } = useEducation();

  if (
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/e/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  if (pathname === "/" || isMarketingPath(pathname)) {
    return <YandeGlobalFab />;
  }

  if (shouldHideFloatingActions(pathname)) return null;

  const pageSlug = pathname.split("/")[1] || "home";
  return (
    <FloatingActionStack>
      <FloatingActionItem>
        <YandeGlobalFab variant="stacked" />
      </FloatingActionItem>
      <FloatingActionItem>
        <LearnFab onClick={() => showRandomForPage(pageSlug)} />
      </FloatingActionItem>
    </FloatingActionStack>
  );
}

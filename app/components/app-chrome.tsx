"use client";

import { usePathname } from "next/navigation";
import { LanguageBar } from "@/app/components/language-bar";
import { MobileBottomNav } from "@/app/components/mobile-nav";
import { ProfileBadge, ProfileSetupModal } from "@/app/components/user-profile";
import { ReportBug } from "@/app/components/report-bug";

/** Hide legacy app chrome on the marketing landing so only Kebu hero nav shows. */
export function AppChrome() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <>
      <LanguageBar />
      <ProfileSetupModal />
      <ProfileBadge />
      <ReportBug />
      <MobileBottomNav />
    </>
  );
}

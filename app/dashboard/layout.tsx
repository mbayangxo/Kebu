import Link from "next/link";
import type { ReactNode } from "react";
import { builtinsEnabled } from "@/lib/live/app-access";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>
    {builtinsEnabled() && <Link href="/app-store" className="block border-b px-5 py-2 text-sm font-semibold underline">KEBU App Store</Link>}
    {children}
  </>;
}

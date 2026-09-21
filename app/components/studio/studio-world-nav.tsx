"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAccountCorner } from "@/app/components/kebu-account-corner";
import { DataModeDock } from "@/app/components/create/data-mode-provider";
import { KEBU } from "@/lib/kebu-brand";

const LINKS = [
  { label: "Create something", href: "/studio/new" },
  { label: "Assets", href: "/studio/assets" },
  { label: "Library", href: "/studio#library" },
  { label: "Themes", href: "/studio/templates" },
  { label: "Brand", href: "/studio/brand" },
  { label: "Video", href: "/studio/video/new" },
];

export function StudioWorldNav() {
  const path = usePathname();

  return (
    <header
      className="sticky top-0 z-50 flex min-h-14 items-center gap-3 border-b bg-[#FFFCF8]/95 px-3 backdrop-blur sm:px-5"
      style={{ borderColor: KEBU.borders.default }}
    >
      <Link href="/dashboard" className="flex items-center gap-2 pr-2" aria-label="Back to Kebu">
        <KebuMark size={23} />
        <span className="hidden text-[9px] font-black uppercase tracking-[.16em] text-black/45 sm:inline">Kebu</span>
      </Link>
      <Link href="/studio" className="border-l pl-3 text-[11px] font-black uppercase tracking-[.15em]" style={{ borderColor: KEBU.borders.default }}>
        Studio
      </Link>

      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex" aria-label="Studio">
        {LINKS.map((item) => {
          const active = item.href === "/studio#library"
            ? false
            : path === item.href || (item.href !== "/studio/new" && path.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em]"
              style={{
                background: active ? KEBU.black : "transparent",
                color: active ? KEBU.white : KEBU.muted,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/studio/new"
          className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-white md:hidden"
          style={{ background: KEBU.black }}
        >
          Create +
        </Link>
        <DataModeDock />
        <KebuAccountCorner />
      </div>
    </header>
  );
}

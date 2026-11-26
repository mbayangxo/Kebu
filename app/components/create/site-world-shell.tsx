"use client";

import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAccountCorner } from "@/app/components/kebu-account-corner";
import { DataModeDock } from "@/app/components/create/data-mode-provider";
import { CommandPaletteTrigger } from "@/app/components/kebu-command-palette";
import { KEBU } from "@/lib/kebu-brand";

export function SiteWorldShell({
  title,
  backHref,
  liveHref,
  editorHref,
  children,
}: {
  title: string;
  backHref: string;
  liveHref?: string | null;
  editorHref?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F3F1ED] text-black">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur" style={{ borderColor: KEBU.borders.default }}>
        <div className="flex min-h-14 items-center gap-3 px-3 sm:px-5 lg:px-7">
          <Link href={backHref} className="flex min-h-9 items-center gap-2 rounded-full px-2.5 text-[10px] font-black uppercase tracking-[.1em] hover:bg-black/[.035]">
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Back to Kebu</span>
          </Link>
          <span className="h-5 w-px bg-black/10" aria-hidden />
          <KebuMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black">{title}</p>
            <p className="text-[8px] font-bold uppercase tracking-[.14em] text-black/35">Site world</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <CommandPaletteTrigger />
            {liveHref ? (
              <a href={liveHref} target="_blank" rel="noreferrer" className="hidden rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] sm:inline-flex" style={{ borderColor: KEBU.borders.default }}>
                Open live ↗
              </a>
            ) : null}
            {editorHref ? (
              <Link href={editorHref} className="rounded-full bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-white">
                Edit site
              </Link>
            ) : null}
            <DataModeDock />
            <KebuAccountCorner />
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-56px)]">{children}</main>
    </div>
  );
}

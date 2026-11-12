"use client";

import Link from "next/link";
import { StudioWorldNav } from "@/app/components/studio/studio-world-nav";
import { StudioUploadsLibrary } from "@/app/components/studio/studio-uploads-library";
import { KEBU } from "@/lib/kebu-brand";

export default function StudioAssetsPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF8] text-black">
      <StudioWorldNav />
      <main className="mx-auto max-w-[1320px] px-4 py-7 sm:px-7 lg:px-10">
        <header className="mb-7 border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Studio assets</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-[-.04em] sm:text-5xl">Your reusable media.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                Images, video and audio uploaded to this Kebu space. Assets are reusable across Studio projects and can be cached for offline work.
              </p>
            </div>
            <Link href="/studio/new" className="rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white">
              Create something +
            </Link>
          </div>
        </header>

        <StudioUploadsLibrary
          onPickImage={() => {}}
          onPickVideo={() => {}}
        />
      </main>
    </div>
  );
}

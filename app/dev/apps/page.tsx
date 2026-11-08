"use client";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { type DeveloperApp } from "@/lib/marketplace/model";
import { useLoad,mainButton,altButton,Notice } from "@/app/components/marketplace/shared";
export default function DeveloperApps(){
  const {value,error,loading}=useLoad<{apps:DeveloperApp[]}>("/api/dev/apps");
  return <AppShell title="Developer apps"><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-7">
    <header className="flex flex-wrap items-end justify-between gap-4"><div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8c3000]">KEBU developers</p>
      <h1 className="mt-2 text-4xl" style={{fontFamily:"var(--font-fraunces)"}}>Your apps</h1>
      <p className="mt-2 text-sm text-[#5c5348]">Create a listing, submit it for review, and let people add your app.</p>
    </div><Link href="/dev/apps/new" className={mainButton}>Create app</Link></header>
    <Notice message={error}/>
    {loading?<p role="status">Loading apps…</p>:value?.apps.length?<div className="grid gap-4 sm:grid-cols-2">
      {value.apps.map(a=><article key={a.id} className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-black/10 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-[#5c5348]">{a.status} · Revision {a.revision}</p>
        <h2 className="break-words text-xl font-bold">{a.name}</h2><p className="text-sm">{a.tagline}</p>
        <Link className={altButton+" mt-auto w-fit"} href={"/dev/apps/"+a.id}>Manage app</Link>
      </article>)}</div>:!error&&<p>No apps yet. Create your first draft to get started.</p>}
    <Link href="/app-store" className="text-sm underline">Browse the KEBU App Store</Link>
  </main></AppShell>;
}

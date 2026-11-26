import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { BrandBrainEditor } from "@/app/components/create/brand-brain-editor";
import { KEBU } from "@/lib/kebu-brand";

export default function StudioBrandPage() {
  return <AppShell title="Brand Brain"><main className="mx-auto max-w-2xl px-5 py-6">
    <Link href="/studio" className="text-[12px] font-semibold underline" style={{color:KEBU.orange}}>← Studio</Link>
    <Link href="/studio/campaigns" className="ml-4 text-[12px] underline">Campaigns</Link>
    <Link href="/studio/brand/legacy" className="ml-4 text-[12px] underline">Original Brand DNA editor</Link>
    <h1 className="mt-4 text-2xl font-semibold" style={{fontFamily:"var(--font-fraunces)"}}>Brand Brain</h1>
    <p className="mb-5 mt-2 text-sm" style={{color:KEBU.muted}}>Your brand, creative direction, taste and movement rules—saved together so you don’t have to keep explaining them.</p>
    <BrandBrainEditor/>
  </main></AppShell>;
}

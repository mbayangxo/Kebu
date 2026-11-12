import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

export default function WorkHubPage(){
  return <AppShell title="Work">
    <div className="mx-auto max-w-[1100px] px-4 py-4 sm:px-6">
      <header className="border-b pb-4" style={{borderColor:KEBU.border}}>
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Work</p>
        <h1 className="mt-1 text-[30px] tracking-[-.04em]" style={{fontFamily:"var(--font-fraunces)"}}>What needs to happen next.</h1>
        <p className="mt-1 text-[10px] text-black/40">Tasks and time live together. Files and documents stay in Library.</p>
      </header>
      <div className="grid border-t sm:grid-cols-2" style={{borderColor:KEBU.border}}>
        <Link href="/tasks" className="group min-h-[180px] border-b py-5 sm:border-r sm:px-5" style={{borderColor:KEBU.border}}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="work" size={17} style={{color:KEBU.orange}}/></span>
          <h2 className="mt-6 text-[20px]" style={{fontFamily:"var(--font-fraunces)"}}>Tasks</h2>
          <p className="mt-1 max-w-sm text-[9px] leading-relaxed text-black/40">Personal and business next steps, with due dates and completion state.</p>
          <p className="mt-6 text-[9px] font-semibold">Open tasks →</p>
        </Link>
        <Link href="/calendar" className="group min-h-[180px] border-b py-5 sm:px-5" style={{borderColor:KEBU.border}}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="calendar" size={17} style={{color:KEBU.orange}}/></span>
          <h2 className="mt-6 text-[20px]" style={{fontFamily:"var(--font-fraunces)"}}>Calendar</h2>
          <p className="mt-1 max-w-sm text-[9px] leading-relaxed text-black/40">Events, deadlines and meetings connected to the work they belong to.</p>
          <p className="mt-6 text-[9px] font-semibold">Open calendar →</p>
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4" style={{borderColor:KEBU.border}}>
        <span className="text-[9px] text-black/35">Need a file or document?</span>
        <Link href="/library" className="rounded-full border px-3 py-2 text-[8px] font-semibold" style={{borderColor:KEBU.border}}>Open Library</Link>
      </div>
    </div>
  </AppShell>;
}

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

const WORK = [
  ["Library", "Files, designs and sites in one connected view.", "/library", "library"],
  ["Docs", "Notes and working documents.", "/docs", "work"],
  ["Tasks", "Clear next steps across your spaces.", "/tasks", "work"],
  ["Calendar", "Events and deadlines tied to your work.", "/calendar", "calendar"],
  ["People", "The teammates already connected to your business spaces.", "/people", "people"],
  ["Chat", "Personal and business space channels.", "/chat", "message"],
] as const;

export default function WorkHubPage() {
  return (
    <AppShell title="Work">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
        <header className="border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Work</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>The practical side of Kebu.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Files, writing, tasks, time and people share the same account and space model instead of acting like unrelated apps.</p>
        </header>
        <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {WORK.map(([label, description, href, icon], index) => (
            <Link key={href} href={href} className="group min-h-[180px] rounded-[22px] border bg-white p-5 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(10,10,10,.06)] focus-visible:ring-2 focus-visible:ring-[#FF5500]" style={{ borderColor: KEBU.borders.default }}>
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: index % 2 ? KEBU.black : "rgba(255,106,0,.09)", color: index % 2 ? KEBU.orange : KEBU.orange }}><KebuIcon name={icon as KebuIconName} size={18} /></span>
                <span className="text-black/20 transition group-hover:translate-x-1">→</span>
              </div>
              <h2 className="mt-7 text-[15px] font-black">{label}</h2>
              <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

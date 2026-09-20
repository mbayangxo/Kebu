import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU_TOOLS } from "@/lib/account/kebu-setup";
import { KEBU } from "@/lib/kebu-brand";

export default function ToolsPage() {
  const groups = [...new Set(KEBU_TOOLS.map((tool) => tool.group))];
  return (
    <AppShell title="All tools">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
        <header className="border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>All tools</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Everything in Kebu, without cluttering your home.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Your pinned tools stay personal. This is the complete launcher for capabilities that are live today.</p>
        </header>

        <div className="space-y-8 py-6">
          {groups.map((group) => (
            <section key={group}>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[.15em]" style={{ color: KEBU.muted }}>{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {KEBU_TOOLS.filter((tool) => tool.group === group).map((tool) => (
                  <Link key={tool.id} href={tool.href} className="rounded-[18px] border bg-white p-4 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(10,10,10,.05)] focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: "rgba(255,106,0,.09)", color: KEBU.orange }}><KebuIcon name={tool.icon as KebuIconName} size={18} /></span>
                    <p className="mt-5 text-[12px] font-black">{tool.label}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{group}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

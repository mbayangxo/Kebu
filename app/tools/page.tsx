import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU_TOOLS } from "@/lib/account/kebu-setup";
import { KEBU } from "@/lib/kebu-brand";

export default function ToolsPage() {
  const groups = [...new Set(KEBU_TOOLS.map((tool) => tool.group))];
  return (
    <AppShell title="Tools">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
        <header className="border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Kebu tools</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Find a capability when you need it.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>This is a directory, not another home screen. Your everyday products stay in Personal or Business; less-frequent capabilities live here.</p>
        </header>

        <div className="space-y-8 py-6">
          {groups.map((group) => (
            <section key={group}>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[.15em]" style={{ color: KEBU.muted }}>{group}</p>
              <div className="overflow-hidden rounded-[20px] border bg-white">
                {KEBU_TOOLS.filter((tool) => tool.group === group).map((tool) => (
                  <Link key={tool.id} href={tool.href} className="flex min-h-16 items-center gap-3 border-b px-4 py-3 outline-none transition last:border-b-0 hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.subtle }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: "rgba(255,106,0,.09)", color: KEBU.orange }}><KebuIcon name={tool.icon as KebuIconName} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-black">{tool.label}</span>
                      <span className="mt-0.5 block text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{group}</span>
                    </span>
                    <KebuIcon name="arrowRight" size={15} style={{ color: KEBU.faint }} />
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

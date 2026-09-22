import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

const SECTIONS: Array<{label:string;detail:string;href:string;icon:KebuIconName}> = [
  { label:"Account", detail:"Name, photo, identity and account details.", href:"/account", icon:"people" },
  { label:"Personalization", detail:"Choose how Kebu starts and which tools matter to you.", href:"/welcome?edit=1", icon:"settings" },
  { label:"Business settings", detail:"Business identities, teams and workspace configuration.", href:"/business", icon:"spaces" },
  { label:"Security", detail:"Sign-in and account security controls.", href:"/account#security", icon:"settings" },
  { label:"Offline & data", detail:"Connection-aware behavior and data-saving preferences.", href:"/account#data", icon:"library" },
];

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-[920px] px-4 py-5 sm:px-6">
        <div className="flex items-end justify-between border-b pb-4" style={{borderColor:KEBU.border}}>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu</p>
            <h1 className="mt-1 text-[28px] tracking-[-.04em]" style={{fontFamily:"var(--font-fraunces)"}}>Settings</h1>
          </div>
        </div>
        <div className="mt-2">
          {SECTIONS.map((item)=>(
            <Link key={item.label} href={item.href} className="flex items-center gap-3 border-b py-4 transition hover:pl-1" style={{borderColor:KEBU.border}}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[.04]"><KebuIcon name={item.icon} size={17}/></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{item.label}</span><span className="mt-0.5 block text-[9px] text-black/38">{item.detail}</span></span>
              <span className="text-black/25">→</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

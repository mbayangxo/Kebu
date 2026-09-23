import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { ReachCampaignsPanel } from "@/app/components/reach/reach-campaigns-panel";
import { ReachWalletPanel } from "@/app/components/reach/reach-wallet-panel";
import { KEBU } from "@/lib/kebu-brand";

export default async function ReachHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/reach");

  return (
    <AppShell title="Reach">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-7">

        {/* Page header */}
        <header className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Kebu Reach</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              Promote &amp; place.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
              Tracked links (free) plus paid Reach Board placement with CPC bidding.
              Impressions are real viewport events only — never estimated or padded.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reach/board"
              className="rounded-full border px-5 py-2.5 text-xs font-bold transition hover:bg-black/[.04]"
              style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
            >
              View board
            </Link>
            <Link
              href="/studio"
              className="rounded-full px-5 py-2.5 text-xs font-bold text-white"
              style={{ background: KEBU.orange }}
            >
              Create creative →
            </Link>
          </div>
        </header>

        {/* How it works — dark card */}
        <div className="relative mt-6 overflow-hidden rounded-[22px] p-5 sm:p-6" style={{ background: KEBU.black }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 80% 50%,#FF5500,transparent 55%),radial-gradient(ellipse at 10% 80%,#6C63FF,transparent 50%)" }} />
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/30">How paid placement works</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                Top up Reach credits → set a CPC bid and budget → enable board → your creative competes on{" "}
                <Link href="/reach/board" className="font-bold" style={{ color: KEBU.orange }}>
                  /reach/board
                </Link>
                . Clicks spend credits. Empty board means nobody eligible — we do not invent ads.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:items-end lg:justify-center">
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full" style={{ background: KEBU.orange }} />
                <span className="text-[10px] font-black uppercase tracking-wide text-white/60">Real viewport events</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-[10px] font-black uppercase tracking-wide text-white/60">Pay per click only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panels */}
        <div className="mt-6 space-y-5">
          <ReachWalletPanel />
          <ReachCampaignsPanel />
        </div>

      </div>
    </AppShell>
  );
}

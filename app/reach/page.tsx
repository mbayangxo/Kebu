import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReachCampaignsPanel } from "@/app/components/reach/reach-campaigns-panel";
import { ReachWalletPanel } from "@/app/components/reach/reach-wallet-panel";

export default async function ReachHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/reach");
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFF8F0" }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-4 py-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Reach</p>
            <h1 className="font-display text-2xl font-bold text-ink">Promote & place</h1>
            <p className="text-sm text-muted mt-1 max-w-xl leading-relaxed">
              Tracked links (free) plus paid Reach Board placement with CPC bidding. Impressions are
              real viewport events only — never estimated or padded.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/reach/board" className="text-sm underline self-center opacity-70">
              View board
            </Link>
            <Link
              href="/studio"
              className="rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: "#E05A2B" }}
            >
              Create creative
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <section className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs leading-relaxed opacity-80">
          <strong>How paid placement works here:</strong> top up Reach credits → set a CPC bid and
          budget → enable board → your creative competes on{" "}
          <Link href="/reach/board" className="underline font-semibold">
            /reach/board
          </Link>
          . Clicks spend credits. Empty board means nobody eligible — we do not invent ads.
        </section>
        <ReachWalletPanel />
        <ReachCampaignsPanel />
      </main>
    </div>
  );
}

import Link from "next/link";
import { ReachBoardPanel } from "@/app/components/reach/reach-board-panel";

/** Public paid placement inventory — CPC auction winners only (S10b). */
export default function ReachBoardPage() {
  return (
    <div className="min-h-screen" style={{ background: "#FFF8F0" }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-4 py-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Reach</p>
            <h1 className="font-display text-2xl font-bold text-ink">Placement board</h1>
            <p className="text-sm text-muted mt-1 max-w-xl leading-relaxed">
              Paid creatives ranked by CPC bid. A view counts only when the card is at least half
              visible — we never invent impressions.
            </p>
          </div>
          <Link href="/reach" className="text-sm underline opacity-70">
            Manage campaigns
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <ReachBoardPanel />
      </main>
    </div>
  );
}

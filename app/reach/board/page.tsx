import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { ReachBoardPanel } from "@/app/components/reach/reach-board-panel";
import { KEBU } from "@/lib/kebu-brand";

/** Public paid placement inventory — CPC auction winners only. */
export default function ReachBoardPage() {
  return (
    <AppShell title="Reach Board">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-7">
        <header className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Reach Board</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              Placement board.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
              Paid creatives ranked by CPC bid. A view counts only when the card is at least half
              visible — we never invent impressions.
            </p>
          </div>
          <Link
            href="/reach"
            className="rounded-full border px-5 py-2.5 text-xs font-bold transition hover:bg-black/[.04]"
            style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
          >
            Manage campaigns
          </Link>
        </header>

        <div className="mt-6">
          <ReachBoardPanel />
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import type { StudioCoach } from "@/lib/studio/coach";

/** Teach-me panel — lessons tied to this design (learn by building). */
export function StudioCoachPanel({
  coach,
  onDismiss,
}: {
  coach: StudioCoach | null | undefined;
  onDismiss?: () => void;
}) {
  if (!coach || coach.mode !== "teach_me" || !coach.lessons.length) return null;

  return (
    <aside className="border-b border-black/10 bg-[#0F0D33] text-white px-4 py-3 shrink-0 max-h-48 overflow-y-auto">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Teach me</p>
          <p className="text-xs opacity-70 mt-0.5">
            Why Kebu made these choices — edit the canvas; learning happens on the work.
          </p>
        </div>
        {onDismiss ? (
          <button type="button" className="text-[11px] underline opacity-60 shrink-0" onClick={onDismiss}>
            Hide
          </button>
        ) : null}
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {coach.lessons.map((l) => (
          <li key={l.id} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-orange-300/90">{l.topic}</p>
            <p className="text-xs font-semibold mt-0.5">{l.title}</p>
            <p className="text-[11px] opacity-70 mt-1 leading-relaxed">{l.why}</p>
            {l.tip ? <p className="text-[10px] text-emerald-300/80 mt-1.5 leading-relaxed">Tip: {l.tip}</p> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}

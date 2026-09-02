"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { YandeMark } from "@/app/components/yande-mark";
import { BUILDER } from "@/lib/create/builder-ui";

const STARTERS = [
  "How do I add photos to my music page?",
  "How do I connect maylecor.com on Namecheap?",
  "How do I change my site colors?",
  "What should I publish first?",
] as const;

export function YandeGlobalFab({
  variant = "fixed",
  projectId,
}: {
  /** fixed = bottom-right solo. stacked = sits above Learn in the FAB column. */
  variant?: "fixed" | "stacked";
  projectId?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const inBuilder = pathname.startsWith("/create/") && pathname !== "/create" && !pathname.startsWith("/create/sites");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/yande/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: projectId ? `[Site project ${projectId}] ${q}` : q,
          pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Yande could not respond.");
        return;
      }
      setReply(data.reply ?? "");
      setMessage("");
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const panel = open ? (
    <div
      ref={panelRef}
      className={`w-full rounded-2xl overflow-hidden shadow-2xl border ${variant === "stacked" ? "mb-2" : ""}`}
      style={{
        background: BUILDER.yandeGradient,
        borderColor: BUILDER.border,
        animation: "yande-slide-up 0.2s ease-out",
        maxWidth: variant === "fixed" ? "min(100vw - 2rem, 380px)" : "min(100vw - 2rem, 340px)",
      }}
      role="dialog"
      aria-label="Yande assistant"
    >
      <div className="h-1 w-full" style={{ background: BUILDER.gradient }} />
      <div className="p-4 space-y-3 max-h-[min(70vh,520px)] overflow-y-auto">
        <div className="flex items-center gap-2">
          <YandeMark size={32} />
          <div>
            <p className="font-display font-bold text-base">Yande</p>
            <p className="text-[11px]" style={{ color: BUILDER.muted }}>
              {inBuilder ? "Build your site end to end" : "Sites, domains, business ID"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto text-xs font-bold uppercase opacity-60 hover:opacity-100"
          >
            Close
          </button>
        </div>

        {reply ? (
          <div
            className="rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: "#fff", border: `1px solid ${BUILDER.border}` }}
          >
            {reply}
          </div>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
            Ask about pages, photos, colors, domains, music, shop, or what to do next.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => void ask(s)}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50"
              style={{ background: BUILDER.orangeGlow, color: BUILDER.ink }}
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(message);
          }}
          className="flex gap-2"
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Yande…"
            className="flex-1 rounded-full px-3 py-2 text-sm border"
            style={{ borderColor: BUILDER.border }}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: BUILDER.orange }}
          >
            {busy ? "…" : "Ask"}
          </button>
        </form>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  ) : null;

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 font-semibold text-sm text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: BUILDER.ink }}
      aria-expanded={open}
      aria-label={open ? "Close Yande" : "Open Yande AI assistant"}
    >
      <YandeMark size={36} />
      <span className="hidden sm:inline">Yande</span>
    </button>
  );

  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-end">
        {panel}
        {trigger}
      </div>
    );
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        className="fixed z-[70] right-4 flex flex-col items-end gap-3 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-6"
        style={{ maxWidth: "min(100vw - 2rem, 380px)" }}
      >
        {panel}
        {trigger}
      </div>
    </>
  );
}

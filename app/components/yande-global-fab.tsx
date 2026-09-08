"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { YandeMark } from "@/app/components/yande-mark";
import { BUILDER } from "@/lib/create/builder-ui";

const STARTERS = [
  "How do I add photos to my music page?",
  "How do I connect maylecor.com on Namecheap?",
  "How do I change my site colors?",
  "What should I publish first?",
] as const;

const POS_KEY = "kebu.yande.fab.pos";

type FabPos = { x: number; y: number };

function clampPos(x: number, y: number, size: number): FabPos {
  if (typeof window === "undefined") return { x, y };
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - size - pad);
  const maxY = Math.max(pad, window.innerHeight - size - pad);
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}

function defaultPos(size: number): FabPos {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  return clampPos(window.innerWidth - size - 16, window.innerHeight - size - 24, size);
}

export function YandeGlobalFab({
  variant = "fixed",
  projectId,
}: {
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
  const size = variant === "stacked" ? 56 : 64;
  const [pos, setPos] = useState<FabPos>(() => defaultPos(size));
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const inBuilder =
    pathname.startsWith("/create/") && pathname !== "/create" && !pathname.startsWith("/create/sites");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FabPos;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(clampPos(parsed.x, parsed.y, size));
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setPos(defaultPos(size));
  }, [size]);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y, size));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [size]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const persistPos = useCallback((next: FabPos) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

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
        <div className="flex items-center gap-3">
          <YandeMark size={44} />
          <div className="min-w-0">
            <p className="font-display font-bold text-base leading-tight">Yande</p>
            <p className="text-[11px]" style={{ color: BUILDER.muted }}>
              {inBuilder ? "Here to help you build" : "Your Kebu guide"}
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
            Ask about pages, photos, colors, music, shop, or what to do next. Drag the icon to move it.
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

  const onPointerDown = (e: React.PointerEvent) => {
    if (variant === "stacked") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) {
      setPos(clampPos(d.origX + dx, d.origY + dy, size));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (d.moved) {
      setPos((p) => {
        const next = clampPos(p.x, p.y, size);
        persistPos(next);
        return next;
      });
      return;
    }
    setOpen((o) => !o);
  };

  const trigger = (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`group relative rounded-full transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5500] ${
        dragging ? "scale-105 cursor-grabbing" : "hover:scale-105 active:scale-95 cursor-grab"
      }`}
      aria-expanded={open}
      aria-label={open ? "Close Yande" : "Ask Yande — drag to move"}
      title="Drag to move · tap to open"
      style={{ touchAction: "none" }}
    >
      <YandeMark size={size} />
      <span
        className="pointer-events-none absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white"
        style={{ background: "#00C851" }}
        aria-hidden
      />
      <span className="sr-only">Yande</span>
    </button>
  );

  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-end">
        {panel}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="group relative rounded-full transition-transform hover:scale-105 active:scale-95"
          aria-expanded={open}
          aria-label={open ? "Close Yande" : "Ask Yande"}
        >
          <YandeMark size={size} />
          <span
            className="pointer-events-none absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white"
            style={{ background: "#00C851" }}
            aria-hidden
          />
        </button>
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
        className="fixed z-[70] flex flex-col-reverse items-end gap-3"
        style={{
          left: pos.x,
          top: pos.y,
          maxWidth: "min(100vw - 2rem, 380px)",
          transform: "translateY(0)",
        }}
      >
        {trigger}
        {panel}
      </div>
    </>
  );
}

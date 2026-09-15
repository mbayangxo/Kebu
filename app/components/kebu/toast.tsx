"use client";

import { useState, useEffect, useCallback } from "react";
import { KEBU } from "@/lib/kebu-brand";

type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
};

type ToastState = {
  toasts: Toast[];
  add: (message: string, kind?: ToastKind) => void;
  remove: (id: string) => void;
};

let _add: ToastState["add"] = () => {};

/** Call from anywhere — no hook or context needed. */
export function toast(message: string, kind: ToastKind = "success") {
  _add(message, kind);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    _add = add;
    return () => { _add = () => {}; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none lg:bottom-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={remove} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const bg = t.kind === "success" ? "#059669" : t.kind === "error" ? "#EF4444" : KEBU.black;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-white text-sm font-semibold max-w-xs transition-all duration-300"
      style={{
        background: bg,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <span className="flex-1">{t.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="text-white/70 hover:text-white shrink-0 text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

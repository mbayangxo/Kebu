"use client";

import { useEffect, useState } from "react";
import { YandeMark } from "@/app/components/yande-mark";
import {
  BUILDER,
  YANDE_IMPROVE_MODES,
  YANDE_SUGGESTIONS_IMPROVE,
} from "@/lib/create/builder-ui";
import type { BuilderDevice } from "@/lib/create/builder-device";
import type { AiSectionChange } from "@/lib/create/ai-improve-merge";

export type YandeImproveMode = "free" | "redesign" | "page" | "rewrite" | "convert";

const ASK_OPEN_KEY = "kebu_builder_ask_open_v1";

/**
 * Right-side “Ask your site” panel (Shopify Sidekick-style).
 * Minimized = tiny FAB; open = docked panel with X to close.
 */
export function BuilderSiteCommandBar({
  value,
  onChange,
  mode = "free",
  onModeChange,
  onPreview,
  onApply,
  onDiscard,
  busy = false,
  device,
  preview,
  sectionChanges = [],
  acceptedSectionIds,
  onToggleSection,
  onSelectAllSections,
  onClearAllSections,
}: {
  value: string;
  onChange: (value: string) => void;
  mode?: YandeImproveMode;
  onModeChange?: (mode: YandeImproveMode) => void;
  onPreview: () => void;
  onApply: () => void;
  onDiscard: () => void;
  busy?: boolean;
  device: BuilderDevice;
  preview?: { intents: string[]; repaired?: boolean } | null;
  sectionChanges?: AiSectionChange[];
  acceptedSectionIds?: Set<string>;
  onToggleSection?: (sectionId: string) => void;
  onSelectAllSections?: () => void;
  onClearAllSections?: () => void;
}) {
  const reviewing = Boolean(preview);
  const hasSections = sectionChanges.length > 0 && acceptedSectionIds && onToggleSection;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ASK_OPEN_KEY);
      if (stored === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (reviewing) setOpen(true);
  }, [reviewing]);

  function setOpenPersist(next: boolean) {
    setOpen(next);
    try {
      localStorage.setItem(ASK_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpenPersist(true)}
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border bg-white px-3 py-2 shadow-lg"
        style={{ borderColor: BUILDER.border }}
        aria-label="Open Ask your site"
        title="Ask your site"
      >
        <YandeMark size={22} />
        <span className="text-[11px] font-semibold" style={{ color: BUILDER.ink }}>
          Ask
        </span>
      </button>
    );
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[60] flex w-[min(100%,360px)] flex-col border-l bg-white shadow-xl"
      style={{ borderColor: BUILDER.border }}
      aria-label="Ask Yande to change your site"
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: BUILDER.border }}
      >
        <YandeMark size={26} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold" style={{ color: BUILDER.ink }}>
            {reviewing ? "Review proposal" : "Ask your site"}
          </p>
          <p className="truncate text-[10px]" style={{ color: BUILDER.muted }}>
            {reviewing ? "Preview on canvas · apply to save" : `${device} · preview before save`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenPersist(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
          style={{ color: BUILDER.muted, background: BUILDER.surfaceMuted }}
          aria-label="Close Ask your site"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {reviewing && preview ? (
          <div className="space-y-3">
            {hasSections ? (
              <div className="space-y-2">
                <div className="flex justify-end gap-2 text-[10px] font-semibold">
                  <button type="button" className="underline" style={{ color: BUILDER.muted }} onClick={onSelectAllSections}>
                    All
                  </button>
                  <button type="button" className="underline" style={{ color: BUILDER.muted }} onClick={onClearAllSections}>
                    None
                  </button>
                </div>
                <ul
                  className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg p-2 text-xs"
                  style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
                >
                  {sectionChanges.map((change) => {
                    const on = acceptedSectionIds.has(change.sectionId);
                    return (
                      <li key={change.sectionId} className="flex items-start gap-2 px-1 py-1">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={busy}
                          onChange={() => onToggleSection(change.sectionId)}
                          className="mt-0.5"
                          aria-label={`Apply ${change.summary}`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: BUILDER.ink }}>
                            {change.summary}
                          </p>
                          <p className="text-[10px] opacity-60">
                            {change.pageTitle} · {change.sectionType}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <ul
                className="space-y-1.5 rounded-lg p-3 text-xs leading-relaxed"
                style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
              >
                {preview.intents.map((intent) => (
                  <li key={intent} className="flex gap-2" style={{ color: BUILDER.ink }}>
                    <span aria-hidden style={{ color: BUILDER.orange }}>
                      •
                    </span>
                    <span>{intent}</span>
                  </li>
                ))}
              </ul>
            )}
            {preview.repaired ? (
              <p className="text-[10px]" style={{ color: BUILDER.muted }}>
                Yande repaired schema issues before showing this preview.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || (hasSections && acceptedSectionIds.size === 0)}
                onClick={onApply}
                className="rounded-md px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                style={{ background: BUILDER.orange }}
              >
                {busy ? "…" : "Apply"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDiscard}
                className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
                style={{ color: BUILDER.muted, border: `1px solid ${BUILDER.border}` }}
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <>
            {onModeChange ? (
              <div className="mb-2 flex flex-wrap gap-1">
                {YANDE_IMPROVE_MODES.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      title={m.hint}
                      onClick={() => {
                        onModeChange(m.id);
                        if (!value.trim()) onChange(m.seed);
                      }}
                      className="rounded-md px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                      style={{
                        background: active ? BUILDER.orangeGlow : BUILDER.surfaceMuted,
                        color: active ? BUILDER.orange : BUILDER.muted,
                        border: active ? `1px solid ${BUILDER.orange}` : `1px solid ${BUILDER.border}`,
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!busy && value.trim()) onPreview();
                }
              }}
              placeholder='e.g. "Make the homepage feel more expensive"'
              disabled={busy}
              rows={4}
              className="w-full resize-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30 disabled:opacity-60"
              style={{ border: `1px solid ${BUILDER.border}`, background: "#fff" }}
            />
            <button
              type="button"
              disabled={busy || !value.trim()}
              onClick={onPreview}
              className="mt-2 w-full rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: BUILDER.orange }}
            >
              {busy ? "…" : "Preview"}
            </button>
            <div className="mt-3 flex flex-wrap gap-1">
              {YANDE_SUGGESTIONS_IMPROVE.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => onChange(s)}
                  className="rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-50"
                  style={{
                    background: BUILDER.surfaceMuted,
                    color: BUILDER.muted,
                    border: `1px solid ${BUILDER.border}`,
                  }}
                >
                  {s.length > 36 ? `${s.slice(0, 36)}…` : s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

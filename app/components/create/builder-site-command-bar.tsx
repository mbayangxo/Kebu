"use client";

import { YandeMark } from "@/app/components/yande-mark";
import {
  BUILDER,
  YANDE_IMPROVE_MODES,
  YANDE_SUGGESTIONS_IMPROVE,
} from "@/lib/create/builder-ui";
import type { BuilderDevice } from "@/lib/create/builder-device";
import type { AiSectionChange } from "@/lib/create/ai-improve-merge";

export type YandeImproveMode = "free" | "redesign" | "page" | "rewrite" | "convert";

/**
 * Floating “Ask your site” bar — preview proposed AI edits before persisting.
 * Modes A5–A8 map to redesign · page · rewrite · convert.
 * Section checkboxes = B6 accept/reject (same as sidebar panel).
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

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:px-6 sm:pb-5"
      aria-label="Ask Yande to change your site"
    >
      <div
        className="pointer-events-auto w-full max-w-2xl rounded-2xl p-3 sm:p-4"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: `1px solid ${BUILDER.border}`,
          boxShadow: "0 16px 48px rgba(10,10,10,0.18)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <YandeMark size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold" style={{ color: BUILDER.ink }}>
              {reviewing ? "Review Yande’s proposal" : "Ask your site"}
            </p>
            <p className="text-[10px] leading-snug truncate" style={{ color: BUILDER.muted }}>
              {reviewing
                ? hasSections
                  ? "Uncheck sections you do not want — canvas updates · apply saves draft"
                  : "Canvas shows the preview — apply to save your draft or discard"
                : `A5–A8 modes · preview before saving · ${device} view`}
            </p>
          </div>
        </div>

        {reviewing && preview ? (
          <div className="space-y-3">
            {hasSections ? (
              <div className="space-y-2">
                <div className="flex justify-end gap-2 text-[10px] font-semibold">
                  <button
                    type="button"
                    className="underline"
                    style={{ color: BUILDER.muted }}
                    onClick={onSelectAllSections}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="underline"
                    style={{ color: BUILDER.muted }}
                    onClick={onClearAllSections}
                  >
                    None
                  </button>
                </div>
                <ul
                  className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl p-2 text-xs"
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
                            {change.isNew ? (
                              <span
                                className="ml-1 text-[9px] uppercase tracking-wider"
                                style={{ color: BUILDER.orange }}
                              >
                                New
                              </span>
                            ) : null}
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
                className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl p-3 text-xs leading-relaxed"
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
                Yande repaired schema issues in this draft before showing the preview.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || (hasSections && acceptedSectionIds.size === 0)}
                onClick={onApply}
                className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: BUILDER.orange }}
              >
                {busy ? "…" : "Apply changes"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDiscard}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                style={{ color: BUILDER.muted, border: `1px solid ${BUILDER.border}`, background: "#fff" }}
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <>
            {onModeChange ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
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
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold disabled:opacity-50"
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
            <div className="flex gap-2">
              <input
                type="text"
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
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30 disabled:opacity-60"
                style={{ border: `1px solid ${BUILDER.border}`, background: "#fff" }}
              />
              <button
                type="button"
                disabled={busy || !value.trim()}
                onClick={onPreview}
                className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: BUILDER.orange }}
              >
                {busy ? "…" : "Preview"}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {YANDE_SUGGESTIONS_IMPROVE.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => onChange(s)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium disabled:opacity-50"
                  style={{
                    background: BUILDER.surfaceMuted,
                    color: BUILDER.muted,
                    border: `1px solid ${BUILDER.border}`,
                  }}
                >
                  {s.length > 42 ? `${s.slice(0, 42)}…` : s}
                </button>
              ))}
            </div>

            <p className="mt-2 text-[10px] leading-relaxed" style={{ color: BUILDER.faint }}>
              Yande proposes structured edits first — nothing saves until you apply. Data Saver stays on while
              you edit.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

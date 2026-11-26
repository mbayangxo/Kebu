"use client";

import { BUILDER_PANEL as BUILDER } from "@/lib/create/builder-panel-appearance";
import type { AiSectionChange } from "@/lib/create/ai-improve-merge";

export function BuilderAiPreviewPanel({
  intents,
  sectionChanges,
  acceptedSectionIds,
  onToggleSection,
  onSelectAll,
  onClearAll,
  onApply,
  onDiscard,
  busy,
  showSideBySideHint = true,
}: {
  intents: string[];
  sectionChanges: AiSectionChange[];
  acceptedSectionIds: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onApply: () => void;
  onDiscard: () => void;
  busy?: boolean;
  showSideBySideHint?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: BUILDER.surface, color: BUILDER.ink, colorScheme: BUILDER.colorScheme, border: `1px solid ${BUILDER.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: BUILDER.ink }}>
            Proposed changes
          </p>
          {showSideBySideHint ? (
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
              Canvas shows the preview. Uncheck sections you do not want — only checked sections apply.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 text-[10px] font-semibold">
          <button type="button" disabled={busy} className="min-h-11 min-w-11 underline disabled:opacity-50" style={{ color: BUILDER.muted }} onClick={onSelectAll}>
            All
          </button>
          <button type="button" disabled={busy} className="min-h-11 min-w-11 underline disabled:opacity-50" style={{ color: BUILDER.muted }} onClick={onClearAll}>
            None
          </button>
        </div>
      </div>

      {sectionChanges.length > 0 ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
          {sectionChanges.map((change) => {
            const on = acceptedSectionIds.has(change.sectionId);
            return (
              <li key={change.sectionId}>
                <label
                  className="flex min-h-11 items-start gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: BUILDER.surfaceMuted, borderLeft: `3px solid ${on ? BUILDER.orange : "transparent"}` }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busy}
                    onChange={() => onToggleSection(change.sectionId)}
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-label={`Apply ${change.summary}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium" style={{ color: BUILDER.ink }}>
                      {change.summary}
                      {change.isNew ? (
                        <span className="ml-1 text-[9px] uppercase tracking-wider" style={{ color: BUILDER.ink }}>
                          New
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[10px]" style={{ color: BUILDER.muted }}>
                      {change.pageTitle} · {change.sectionType}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-1.5 text-xs leading-relaxed max-h-32 overflow-y-auto" style={{ color: BUILDER.muted }}>
          {intents.map((intent) => (
            <li key={intent}>• {intent}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy || (sectionChanges.length > 0 && acceptedSectionIds.size === 0)}
          onClick={onApply}
          className="min-h-11 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
          style={{ background: BUILDER.action, color: BUILDER.onAction }}
        >
          Apply {acceptedSectionIds.size > 0 ? `(${acceptedSectionIds.size})` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDiscard}
          className="min-h-11 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ color: BUILDER.muted, border: `1px solid ${BUILDER.border}` }}
        >
          Discard preview
        </button>
      </div>
    </div>
  );
}

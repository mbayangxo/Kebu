"use client";

import { BUILDER } from "@/lib/create/builder-ui";
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
      style={{ background: BUILDER.surface, border: `1px solid ${BUILDER.border}` }}
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
        <div className="flex shrink-0 gap-2 text-[10px] font-semibold">
          <button type="button" className="underline" style={{ color: BUILDER.muted }} onClick={onSelectAll}>
            All
          </button>
          <button type="button" className="underline" style={{ color: BUILDER.muted }} onClick={onClearAll}>
            None
          </button>
        </div>
      </div>

      {sectionChanges.length > 0 ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
          {sectionChanges.map((change) => {
            const on = acceptedSectionIds.has(change.sectionId);
            return (
              <li
                key={change.sectionId}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                style={{ background: on ? "#FFF4EC" : BUILDER.surfaceMuted }}
              >
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
                      <span className="ml-1 text-[9px] uppercase tracking-wider" style={{ color: BUILDER.orange }}>
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
          disabled={busy || acceptedSectionIds.size === 0}
          onClick={onApply}
          className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: BUILDER.orange }}
        >
          Apply {acceptedSectionIds.size > 0 ? `(${acceptedSectionIds.size})` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDiscard}
          className="rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ color: BUILDER.muted, border: `1px solid ${BUILDER.border}` }}
        >
          Discard preview
        </button>
      </div>
    </div>
  );
}

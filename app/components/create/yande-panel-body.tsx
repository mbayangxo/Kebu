"use client";

import { BUILDER_PANEL as BUILDER } from "@/lib/create/builder-panel-appearance";
import { YandeAssistant } from "./yande-assistant";
import { BuilderAiPreviewPanel } from "./builder-ai-preview-panel";

export type YandePanelBodyProps = {
  aiPreview: {
    definition: import("@/lib/create/website-schema").WebsiteDefinition;
    intents: string[];
    sectionChanges: import("@/lib/create/ai-improve-merge").AiSectionChange[];
    acceptedSectionIds: Set<string>;
    repaired: boolean;
  } | null;
  improving: boolean;
  improveMode: "free" | "redesign" | "page" | "rewrite" | "convert";
  improveInstruction: string;
  improveNote: string | null;
  setImproveMode: (mode: "free" | "redesign" | "page" | "rewrite" | "convert") => void;
  setImproveInstruction: (value: string) => void;
  setAiPreview: import("react").Dispatch<import("react").SetStateAction<YandePanelBodyProps["aiPreview"]>>;
  applyAiPreview: () => void;
  discardAiPreview: () => void;
  previewWithAi: () => void;
};

export function YandePanelBody({
  aiPreview,
  improving,
  improveMode,
  improveInstruction,
  improveNote,
  setImproveMode,
  setImproveInstruction,
  setAiPreview,
  applyAiPreview,
  discardAiPreview,
  previewWithAi,
}: YandePanelBodyProps) {
  return (
    <>
      {/* Mode selector */}
      {!aiPreview ? (
        <div
          className="flex shrink-0 flex-wrap gap-1 border-b px-3 py-2"
          style={{ borderColor: BUILDER.border }}
        >
          {(
            [
              ["free", "Improve"],
              ["redesign", "Redesign"],
              ["page", "Page"],
              ["rewrite", "Rewrite"],
              ["convert", "Convert"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={improving}
              aria-pressed={improveMode === id}
              onClick={() => setImproveMode(id)}
              className="min-h-11 rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: improveMode === id ? BUILDER.action : BUILDER.surfaceMuted,
                color: improveMode === id ? BUILDER.onAction : BUILDER.muted,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* AI preview panel when active */}
      {aiPreview ? (
        <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: BUILDER.border }}>
          <BuilderAiPreviewPanel
            intents={aiPreview.intents}
            sectionChanges={aiPreview.sectionChanges}
            acceptedSectionIds={aiPreview.acceptedSectionIds}
            onApply={applyAiPreview}
            onDiscard={discardAiPreview}
            onToggleSection={(sectionId) => {
              setAiPreview((prev) => {
                if (!prev) return prev;
                const next = new Set(prev.acceptedSectionIds);
                if (next.has(sectionId)) next.delete(sectionId);
                else next.add(sectionId);
                return { ...prev, acceptedSectionIds: next };
              });
            }}
            onSelectAll={() => {
              setAiPreview((prev) =>
                prev
                  ? {
                      ...prev,
                      acceptedSectionIds: new Set(prev.sectionChanges.map((c) => c.sectionId)),
                    }
                  : prev,
              );
            }}
            onClearAll={() => {
              setAiPreview((prev) => (prev ? { ...prev, acceptedSectionIds: new Set() } : prev));
            }}
            busy={improving}
          />
        </div>
      ) : null}

      {/* Yande assistant input */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!aiPreview ? <YandeAssistant
          variant="improve"
          value={improveInstruction}
          onChange={setImproveInstruction}
          onSubmit={previewWithAi}
          busy={improving}
          submitLabel="Preview"
        /> : null}
        {improveNote ? (
          <p
            className="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed"
            style={{ background: BUILDER.surfaceMuted, color: BUILDER.muted }}
          >
            {improveNote}
          </p>
        ) : null}
      </div>
    </>
  );
}

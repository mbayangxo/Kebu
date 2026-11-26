"use client";

import { useRef, useState } from "react";
import { BuilderPanelScope } from "@/app/components/create/builder-appearance-provider";
import { YandePanelBody, type YandePanelBodyProps } from "@/app/components/create/yande-panel-body";
import { Sheet } from "@/app/components/create/sheet";
import { BUILDER_PANEL } from "@/lib/create/builder-panel-appearance";

const preview: NonNullable<YandePanelBodyProps["aiPreview"]> = {
  definition: {
    schemaVersion: "website-v1", title: "Synthetic appearance fixture",
    theme: { primary: "#173B2B", accent: "#FF5500", background: "#FFF8E7", text: "#173B2B", fontDisplay: "system-ui", fontBody: "system-ui", spacing: "comfortable", headingScale: "md", bodySize: "md", letterSpacing: "normal" },
    pages: [],
  },
  intents: ["Synthetic selection fixture; no AI request."], repaired: false,
  sectionChanges: [
    { sectionId: "qa-hero", pageSlug: "home", pageTitle: "Home", sectionType: "hero", summary: "Synthetic hero suggestion", isNew: false },
    { sectionId: "qa-text", pageSlug: "home", pageTitle: "Home", sectionType: "text", summary: "Synthetic text suggestion", isNew: true },
  ],
  acceptedSectionIds: new Set(["qa-hero", "qa-text"]),
};

/** Actual panel callbacks in an explicitly synthetic, non-persistent preview fixture. */
export function YandeAppearanceFixture() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<YandePanelBodyProps["improveMode"]>("free");
  const [instruction, setInstruction] = useState("");
  const [aiPreview, setAiPreview] = useState<YandePanelBodyProps["aiPreview"]>(null);
  const [feedback, setFeedback] = useState("No fixture action yet.");
  const trigger = useRef<HTMLButtonElement>(null);
  const props: YandePanelBodyProps = {
    aiPreview, improving: busy, improveMode: mode, improveInstruction: instruction,
    improveNote: "Fixture feedback only. No provider request or saved project.",
    setImproveMode: setMode, setImproveInstruction: setInstruction, setAiPreview,
    previewWithAi: () => setFeedback("Preview callback observed; no AI request."),
    applyAiPreview: () => setFeedback(`Apply callback observed for ${aiPreview?.acceptedSectionIds.size ?? 0} selected fixture sections; no project changed.`),
    discardAiPreview: () => { setAiPreview(null); setFeedback("Synthetic preview discarded."); },
  };
  return (
    <section className="space-y-2" aria-label="Yande appearance fixture">
      <h2 className="text-sm font-semibold">Yande controls — synthetic QA</h2>
      <p className="text-xs">Local drafts and callback inspection only; reload resets. This does not test AI generation or persistence.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-11 border px-3 text-xs" onClick={() => setAiPreview({ ...preview, acceptedSectionIds: new Set(preview.acceptedSectionIds) })}>Load synthetic suggestions</button>
        <button type="button" aria-pressed={busy} className="min-h-11 border px-3 text-xs" onClick={() => setBusy(value => !value)}>Toggle fixture busy</button>
        <button type="button" ref={trigger} className="min-h-11 border px-3 text-xs" onClick={() => setOpen(true)}>Open Yande fixture sheet</button>
      </div>
      <p className="text-xs" role="status">{feedback}</p>
      <BuilderPanelScope>
        <div data-yande-qa-panel className="flex w-full max-w-[300px] flex-col rounded-xl border" style={{ background: BUILDER_PANEL.surface, color: BUILDER_PANEL.ink, borderColor: BUILDER_PANEL.border }}>
          <YandePanelBody {...props} />
        </div>
      </BuilderPanelScope>
      <Sheet open={open} onClose={() => setOpen(false)} title="Yande appearance QA" triggerRef={trigger} editorAppearance maxHeight="80dvh">
        <YandePanelBody {...props} />
      </Sheet>
    </section>
  );
}

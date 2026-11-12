"use client";

import { useRef, useState } from "react";
import { applyTransaction, createRegistry, expectFor, parseDocument, PILOT_DEFINITIONS, type KcdDocument, type Op } from "@/lib/creative-core";
import envelope from "@/evidence/3c/s7/qa/publish-envelope.json";
import { BuilderPanelScope } from "@/app/components/create/builder-appearance-provider";
import { KcdPrimitivePanel } from "@/app/components/create/kcd/primitive-panel";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { Sheet } from "@/app/components/create/sheet";
import { Drawer } from "@/app/components/create/drawer";
import { FullscreenPanel } from "@/app/components/create/fullscreen-panel";

const registry = createRegistry(PILOT_DEFINITIONS);
function fixtureDocument(): KcdDocument {
  const parsed = parseDocument(envelope.snapshot.document);
  if (!parsed.ok) throw new Error("The synthetic inspector fixture is invalid.");
  return parsed.document;
}

/** Real inspector/operation engine with a synthetic in-memory document, no persistence. */
export function NativeInspectorFixture() {
  const [document, setDocument] = useState(fixtureDocument);
  const current = useRef(document);
  const textNode = Object.values(document.nodes).find(node => node.type === "text");
  const [selectedId, setSelectedId] = useState<string | null>(() => textNode?.id ?? null);
  const [open, setOpen] = useState<"sheet" | "drawer" | "fullscreen" | null>(null);
  const [feedback, setFeedback] = useState("Synthetic in-memory edits; reload resets this fixture.");
  const sheetTrigger = useRef<HTMLButtonElement>(null);
  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const fullscreenTrigger = useRef<HTMLButtonElement>(null);
  const submit = async (label: string, ops: Op[]) => {
    const before = current.current;
    const result = applyTransaction(before, { txId: crypto.randomUUID(), origin: "user", label, ops, expect: expectFor(before, ops) }, registry);
    if (!result.ok) throw new Error(result.error.message);
    current.current = result.document;
    setDocument(result.document);
    setFeedback(`Fixture edit applied in memory: ${label}.`);
  };
  const inspector = <BuilderPanelScope><KcdPrimitivePanel document={document} pageId={document.pages[0].id} device="desktop" selectedId={selectedId} onSelect={setSelectedId} onSubmit={submit} /></BuilderPanelScope>;
  return (
    <section aria-label="Inspector appearance fixture" className="space-y-3">
      <p className="text-xs">Native inspector and portal QA — synthetic data only.</p>
      <div className="flex flex-wrap gap-2">
        <button ref={sheetTrigger} type="button" className="rounded border p-2 text-xs" onClick={() => setOpen("sheet")}>Open add section sheet</button>
        <button ref={drawerTrigger} type="button" className="rounded border p-2 text-xs" onClick={() => setOpen("drawer")}>Open inspector drawer</button>
        <button ref={fullscreenTrigger} type="button" className="rounded border p-2 text-xs" onClick={() => setOpen("fullscreen")}>Open inspector fullscreen</button>
      </div>
      <p role="status" className="text-xs">{feedback}</p>
      <p data-appearance-draft-text className="text-xs">Fixture text: {String(textNode?.props.text ?? "")}</p>
      {open === null ? inspector : null}
      <Sheet editorAppearance open={open === "sheet"} onClose={() => setOpen(null)} title="Appearance add section QA" triggerRef={sheetTrigger}>
        <div className="p-4"><AddSectionPicker pageTitle="Synthetic QA page" onAdd={type => { setFeedback(`Fixture section callback: ${type}; no project modified.`); setOpen(null); }} /></div>
      </Sheet>
      <Drawer editorAppearance open={open === "drawer"} onClose={() => setOpen(null)} title="Appearance inspector drawer QA" triggerRef={drawerTrigger}>{inspector}</Drawer>
      <FullscreenPanel editorAppearance open={open === "fullscreen"} onClose={() => setOpen(null)} title="Appearance inspector fullscreen QA" triggerRef={fullscreenTrigger}>{inspector}</FullscreenPanel>
    </section>
  );
}

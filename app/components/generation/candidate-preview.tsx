"use client";
import { useEffect, useState } from "react";
import type { KcdDocument, NodeId } from "@/lib/creative-core";
import { compareOrder } from "@/lib/creative-core";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { canvasDocumentSchema, exportCanvasToPngDataUrlAsync } from "@/lib/studio/canvas-document";
import { inspectBuilderDom, inspectStudioPage } from "@/lib/generation/preview-checks";
import type { GenerationIssue, GenerationTarget } from "@/lib/generation/contracts";
export type PreviewResult = { issues: GenerationIssue[]; pageId: string; rendered: boolean };
declare global { interface Window { __kebuGenerationCheck?: PreviewResult; __kebuGenerationInspect?: () => PreviewResult; } }
export function CandidatePreview({ id }: { id: string }) {
  const [value, setValue] = useState<{ kind: GenerationTarget; document: unknown } | null>(null), [image, setImage] = useState(""), [error, setError] = useState("");
  const [pageId, setPageId] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    delete window.__kebuGenerationCheck;
    const query = new URL(window.location.href).searchParams;
    const page = query.get("page") ?? "";
    fetch(`/api/generation/preview/${id}`, { credentials: "include", signal: abort.signal }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Preview unavailable.");
      if (!abort.signal.aborted) { setValue(body); setPageId(page || body.document.pages[0].id); }
    }).catch(reason => { if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : "Preview unavailable."); });
    return () => abort.abort();
  }, [id]);
  useEffect(() => {
    if (!value || !pageId) return;
    let active = true;
    void (async () => {
      await document.fonts.ready;
      if (value.kind === "studio") {
        const doc = canvasDocumentSchema.parse(value.document);
        const data = await exportCanvasToPngDataUrlAsync(doc, 1, pageId);
        if (!data) throw new Error("A required image, font or video could not be rendered.");
        if (active) { setImage(data); window.__kebuGenerationInspect = () => ({ rendered: true, pageId, issues: inspectStudioPage(doc, pageId) }); }
      } else {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (active) { window.__kebuGenerationInspect = () => ({ rendered: true, pageId, issues: inspectBuilderDom(pageId) }); window.__kebuGenerationCheck = window.__kebuGenerationInspect(); }
      }
    })().catch(reason => { if (active) { setError(reason instanceof Error ? reason.message : "Render failed."); window.__kebuGenerationCheck = { rendered: false, pageId, issues: [] }; } });
    return () => { active = false; delete window.__kebuGenerationInspect; delete window.__kebuGenerationCheck; };
  }, [value, pageId]);
  if (error) return <p role="alert">{error}</p>;
  if (!value || !pageId) return <p role="status">Preparing private preview…</p>;
  // Canvas exports are already rendered at native resolution; Next image optimization would alter audit evidence.
  // eslint-disable-next-line @next/next/no-img-element
  if (value.kind === "studio") return <main data-generation-preview>{image ? <img src={image} onLoad={() => { window.__kebuGenerationCheck = window.__kebuGenerationInspect?.(); }} onError={() => { setError("Artwork could not be displayed."); window.__kebuGenerationCheck = { rendered: false, pageId, issues: [] }; }} alt="Generated design preview" style={{ display: "block", maxWidth: "100%", height: "auto", margin: "auto" }} /> : <p role="status">Rendering artwork…</p>}</main>;
  const doc = value.document as KcdDocument;
  const roots = Object.values(doc.nodes).filter(node => node.pageId === pageId && node.parentId === null).sort(compareOrder);
  return <main data-generation-preview onClickCapture={event => {
    const anchor = (event.target as Element).closest("a"); if (!anchor) return;
    event.preventDefault(); const href = anchor.getAttribute("href") ?? "";
    if (href.startsWith("#")) { document.getElementById(href.slice(1))?.scrollIntoView(); return; }
    const selected = doc.pages.find(item => (item.slug === "home" ? "/" : `/${item.slug}`) === href);
    if (selected) { delete window.__kebuGenerationCheck; setPageId(selected.id); window.scrollTo(0, 0); }
  }}>
    {roots.map(node => <KcdPrimitiveSubtree key={node.id} document={doc} rootId={node.id as NodeId} device="desktop" responsive />)}
  </main>;
}

"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Device, KcdDocument, NodeId, Transaction } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { KcdPrimitiveSubtree } from "./primitive-subtree";
import { KcdNodeErrorBoundary } from "./node-error-boundary";
export function ExperiencePlanPreview({ document, transaction }: { document: KcdDocument; transaction: Transaction }) {
  const [device, setDevice] = useState<Device>("desktop"), [available, setAvailable] = useState(240), host = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => { const element = host.current; if (!element) return; const observer = new ResizeObserver(entries => setAvailable(entries[0].contentRect.width)); observer.observe(element); return () => observer.disconnect(); }, []);
  const checked = prepareBuilderTransaction(document, transaction);
  if (!checked.ok) return <p role="alert">Preview unavailable: {checked.error.message}</p>;
  const width = device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;
  const roots = transaction.ops.flatMap(op => op.op === "insertNode" && op.parentId === null ? [op.node.id as NodeId] : []);
  return <details className="min-w-0 space-y-2"><summary className="cursor-pointer font-medium">Preview native composition</summary>
    <div><label htmlFor={id} className="block">Preview layout</label><select id={id} value={device} onChange={event => setDevice(event.target.value as Device)} className="mt-1 w-full rounded-lg border p-2"><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Phone</option></select></div>
    <p>Scaled native preview at {width}px. Check the full canvas after applying; publishing is a separate action.</p>
    <div ref={host} className="min-w-0 overflow-hidden rounded-lg border" onClickCapture={event => { if ((event.target as Element).closest("a")) event.preventDefault(); }}>
      <div style={{ width, zoom: Math.min(1, available / width) }}>{roots.map(root => <KcdNodeErrorBoundary key={`${root}-${device}`} revision={transaction.txId}><KcdPrimitiveSubtree document={checked.prediction.document} rootId={root} device={device} /></KcdNodeErrorBoundary>)}</div>
    </div>
  </details>;
}

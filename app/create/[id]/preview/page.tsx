"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { CreateShell } from "@/app/components/create/create-shell";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { builderKcdView } from "@/lib/create/kcd-adapter/builder-view";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { applyPreviewDefinitionUpdate, type PreviewDefinitionUpdate } from "@/lib/create/preview-definition-update";
import { applyKcdPreviewUpdate, type KcdPreviewUpdate } from "@/lib/create/kcd-preview-update";
import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import type { KcdDocument } from "@/lib/creative-core";

// postMessage protocol between the Builder canvas iframe and page.tsx
type PreviewInboundMsg =
  | { type: "kebu:definition:patch"; update: PreviewDefinitionUpdate; nativeUpdate?: KcdPreviewUpdate; selectedNodeId?: string | null; selectedElement?: BuilderElementSelection | null; pageSlug: string; editDevice?: "desktop" | "tablet" | "mobile" }
  | { type: "kebu:definition:update"; definition: WebsiteDefinition; pageSlug: string; editDevice?: "desktop" | "tablet" | "mobile" }
  | { type: "kebu:definition:request" }
  | { type: "kebu:geometry:ack"; requestId: string; error?: string };

function ProjectPreviewInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";
  const [definition, setDefinition] = useState<WebsiteDefinition | null>(null);
  const [nativeDocument, setNativeDocument] = useState<KcdDocument | null>(null);
  const [selectedElement, setSelectedElement] = useState<BuilderElementSelection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const geometryRequests = useRef(new Map<string, { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  const parentNativeRef = useRef<KcdDocument | null>(null);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; sort_order: number }>>([]);
  const [previewPageSlug, setPreviewPageSlug] = useState("home");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  // When embedded in the Builder's device preview iframe, track whether we're using the parent's
  // live definition (via postMessage) or the fetched saved one.
  const parentDefinitionRef = useRef<WebsiteDefinition | null>(null);
  const parentSequenceRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${id}/preview`);
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError(data.error ?? "Could not load preview.");
        return;
      }
      const pageRows = Array.isArray(data.pages) ? data.pages : [];
      const sections = Array.isArray(data.sections) ? data.sections : [];
      if (!cancelled) {
        setPages(pageRows);
        setSubdomain(data.project?.subdomain ?? null);
        // Only use the fetched definition if the parent hasn't already pushed a live one
        if (!parentDefinitionRef.current) {
          if (data.renderPath === "kcd") {
            // 3C: the canonical render view — the same result as the Builder canvas and kcd-1 publishing.
            const view = builderKcdView({ project: data.project, siteChrome: data.siteChrome, pages: pageRows, sections });
            if (view.ok) { setDefinition(view.definition); setNativeDocument(view.nativeDocument ?? null); }
            else setError(view.error);
          } else {
            setDefinition(buildDefinitionFromProjectParts(data.project, pageRows, sections));
          }
        }
        if (!parentDefinitionRef.current && pageRows[0]?.slug) setPreviewPageSlug(pageRows[0].slug);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // In embed mode: receive the Builder's live definition via postMessage so the iframe always
  // shows the current editing state (not just the last saved/autosaved state).
  useEffect(() => {
    if (!embed) return;
    function onMessage(e: MessageEvent) {
      // Only accept messages from our own origin
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const msg = e.data as PreviewInboundMsg;
      if (msg?.type === "kebu:geometry:ack") {
        const pending = geometryRequests.current.get(msg.requestId);
        if (pending) { clearTimeout(pending.timer); geometryRequests.current.delete(msg.requestId); if (msg.error) pending.reject(new Error(msg.error)); else pending.resolve(); }
      } else if (msg?.type === "kebu:definition:patch") {
        const next = applyPreviewDefinitionUpdate(parentDefinitionRef.current, parentSequenceRef.current, msg.update);
        const native = msg.nativeUpdate ? applyKcdPreviewUpdate(parentNativeRef.current, parentSequenceRef.current, msg.nativeUpdate) : null;
        if (!next || native === undefined || (msg.nativeUpdate && msg.nativeUpdate.sequence !== msg.update.sequence)) {
          window.parent.postMessage({ type: "kebu:preview:ready" }, window.location.origin);
          return;
        }
        parentDefinitionRef.current = next;
        parentSequenceRef.current = msg.update.sequence;
        setDefinition(next);
        parentNativeRef.current = native; setNativeDocument(native); setSelectedNodeId(msg.selectedNodeId ?? null); setSelectedElement(msg.selectedElement ?? null); setError(null);
        setPreviewPageSlug(msg.pageSlug);
        if (msg.editDevice) setDevice(msg.editDevice);
      } else if (msg?.type === "kebu:definition:update") {
        parentDefinitionRef.current = msg.definition;
        setDefinition(msg.definition);
        parentNativeRef.current = null; setNativeDocument(null);
        setPreviewPageSlug(msg.pageSlug);
        if (msg.editDevice) setDevice(msg.editDevice);
      } else if (msg?.type === "kebu:definition:request") {
        // Parent is asking us to signal readiness again (e.g. after a page change)
        window.parent.postMessage({ type: "kebu:preview:ready" }, window.location.origin);
      }
    }
    window.addEventListener("message", onMessage);
    // Tell the parent we are ready to receive the live definition
    window.parent.postMessage({ type: "kebu:preview:ready" }, window.location.origin);
    const requests = geometryRequests.current;
    return () => { window.removeEventListener("message", onMessage); for (const pending of requests.values()) { clearTimeout(pending.timer); pending.reject(new Error("The preview closed before the layout edit was confirmed.")); } requests.clear(); };
  }, [embed]);

  if (embed) {
    return (
      <div className="min-h-screen bg-white">
        {error ? <p className="p-6 text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
        {definition ? (
          <SiteRenderer
            definition={definition}
            nativeDocument={nativeDocument ?? undefined}
            mode="preview"
            pageSlug={previewPageSlug}
            siteBase={subdomain ? `/sites/${subdomain}` : undefined}
            editor={{ onSpatialChange: (nodeId, patch) => new Promise<void>((resolve, reject) => {
              const requestId = crypto.randomUUID();
              const timer = setTimeout(() => { geometryRequests.current.delete(requestId); reject(new Error("The layout edit could not be confirmed. Check the saved layout before trying again.")); }, 15000);
              geometryRequests.current.set(requestId, { resolve, reject, timer });
              window.parent.postMessage({ type: "kebu:node:geometry", nodeId, patch, requestId }, window.location.origin);
            }), selectedElement,
              onSelectElement: selection => window.parent.postMessage({ type: "kebu:element:select", selection }, window.location.origin),
              onPatchSection: (sectionId, patch) => window.parent.postMessage({ type: "kebu:section:patch", sectionId, patch }, window.location.origin),
              onNavigatePage: slug => window.parent.postMessage({ type: "kebu:page:navigate", slug }, window.location.origin),
              onEditNavigation: () => window.parent.postMessage({ type: "kebu:navigation:edit" }, window.location.origin),
              editDevice: device, selectedSectionId: selectedNodeId, onSelectSection: (nodeId) => window.parent.postMessage({ type: "kebu:node:select", nodeId }, window.location.origin) }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#111" }}>
      <CreateShell
        step="preview"
        projectId={id}
        title="Preview"
        backHref={`/create/${id}`}
        actions={
          <>
            {pages.length > 1 &&
              pages
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: previewPageSlug === p.slug ? "#00C851" : "#1C1A45",
                      color: previewPageSlug === p.slug ? "#0F0D33" : "#fff",
                    }}
                    onClick={() => setPreviewPageSlug(p.slug)}
                  >
                    {p.title}
                  </button>
                ))}
            <button
              type="button"
              className="rounded-full px-3 py-1 text-[10px] uppercase"
              style={{ background: "#1C1A45", color: "#fff" }}
              onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
            >
              {device}
            </button>
            <Link
              href={`/create/${id}`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "#00C851", color: "#0F0D33" }}
            >
              Back to editor
            </Link>
          </>
        }
      />

      <p className="text-center text-[10px] py-2 px-4 text-white/60">
        Draft preview — what you are editing now. Visitors only see changes after you publish.
        {subdomain ? (
          <>
            {" "}
            Live path: <span className="text-[#00C851]">/sites/{subdomain}</span>
          </>
        ) : null}
      </p>

      {error && <p className="p-6 text-sm text-white/70">{error}</p>}

      <div className="mx-auto py-6 px-2" style={{ maxWidth: device === "mobile" ? 390 : 960 }}>
        {definition && (
          <SiteRenderer
            definition={definition}
            nativeDocument={nativeDocument ?? undefined}
            editor={{ editDevice: device }}
            mode="preview"
            pageSlug={previewPageSlug}
            siteBase={subdomain ? `/sites/${subdomain}` : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function ProjectPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProjectPreviewInner />
    </Suspense>
  );
}

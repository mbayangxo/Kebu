"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { blankLayer, blankSlide, newLayerId, newSlideId, type Slide, type SlideLayer, type SlideLayerType, type SlideTransition } from "@/lib/slides/schema";
import { SlideCanvas } from "@/app/components/slides/slide-canvas";
import { PresentMode } from "@/app/components/slides/present-mode";

type SaveStatus = "loading" | "saved" | "pending" | "saving" | "error" | "not-found" | "conflict";
const AUTOSAVE_DELAY_MS = 700;

function cloneWithNewIds(slide: Slide): Slide {
  return { ...slide, id: newSlideId(), layers: slide.layers.map((layer) => ({ ...layer, id: newLayerId() })) };
}

export function SlideEditor({ id }: { id: string }) {
  const [title, setTitle] = useState("Untitled presentation");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deckWidth, setDeckWidth] = useState(1920);
  const [deckHeight, setDeckHeight] = useState(1080);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [presenting, setPresenting] = useState(false);

  const slidesRef = useRef<Slide[]>([]);
  const dimsRef = useRef({ width: 1920, height: 1080 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const revisionRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const loadedRef = useRef(false);
  const savedTitleRef = useRef("");
  const titleRevisionRef = useRef<string | null>(null);
  const dirtySinceSaveRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      try {
        const response = await fetch(`/api/library/slides/${id}`, { credentials: "include", cache: "no-store" });
        if (response.status === 404) { if (mountedRef.current) setStatus("not-found"); return; }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load presentation.");
        if (!mountedRef.current) return;
        slidesRef.current = data.slides;
        dimsRef.current = { width: data.width, height: data.height };
        revisionRef.current = data.updatedAt ?? null;
        loadedRef.current = true;
        titleRevisionRef.current = data.nodeUpdatedAt ?? null;
        savedTitleRef.current = data.title ?? "";
        setTitle(data.title ?? "Untitled presentation");
        setDeckWidth(data.width);
        setDeckHeight(data.height);
        setSlides(data.slides);
        setStatus("saved");
      } catch (cause) {
        if (mountedRef.current) { setStatus("error"); setErrorMessage(cause instanceof Error ? cause.message : "Could not load presentation."); }
      }
    })();
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [id]);

  const persist = useCallback(() => {
    if (conflictRef.current || !loadedRef.current) return;
    if (savingRef.current) { dirtySinceSaveRef.current = true; return; }
    savingRef.current = true;
    dirtySinceSaveRef.current = false;
    setStatus("saving");
    void (async () => {
      try {
        const response = await fetch(`/api/library/slides/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: revisionRef.current, slides: slidesRef.current, width: dimsRef.current.width, height: dimsRef.current.height }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 || response.status === 428) {
          conflictRef.current = true;
          setStatus("conflict");
          setErrorMessage(data.error);
          return;
        }
        if (!response.ok) throw new Error(data.error || "Could not save presentation.");
        revisionRef.current = data.updatedAt;
        if (mountedRef.current) setStatus(dirtySinceSaveRef.current ? "pending" : "saved");
      } catch (cause) {
        if (mountedRef.current) { setStatus("error"); setErrorMessage(cause instanceof Error ? cause.message : "Could not save presentation."); }
      } finally {
        savingRef.current = false;
        if (dirtySinceSaveRef.current) persist();
      }
    })();
  }, [id]);

  const scheduleSave = useCallback(() => {
    if (conflictRef.current || !loadedRef.current) return;
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY_MS);
  }, [persist]);

  const commitSlides = useCallback((next: Slide[]) => {
    slidesRef.current = next;
    setSlides(next);
    scheduleSave();
  }, [scheduleSave]);

  const activeSlide = slides[activeIndex] as Slide | undefined;

  const patchLayers = useCallback((patches: Record<string, Partial<SlideLayer>>) => {
    if (!activeSlide) return;
    const next = slides.map((slide, idx) => {
      if (idx !== activeIndex) return slide;
      return { ...slide, layers: slide.layers.map((layer) => (patches[layer.id] ? { ...layer, ...patches[layer.id] } : layer)) };
    });
    commitSlides(next);
  }, [slides, activeIndex, activeSlide, commitSlides]);

  const addLayer = useCallback((type: SlideLayerType) => {
    if (!activeSlide) return;
    const layer = blankLayer(newLayerId(), type, { x: deckWidth / 2, y: deckHeight / 2 });
    const next = slides.map((slide, idx) => (idx === activeIndex ? { ...slide, layers: [...slide.layers, layer] } : slide));
    setSelectedIds([layer.id]);
    commitSlides(next);
  }, [slides, activeIndex, activeSlide, deckWidth, deckHeight, commitSlides]);

  const deleteSelected = useCallback(() => {
    if (!activeSlide || !selectedIds.length) return;
    const next = slides.map((slide, idx) => (idx === activeIndex ? { ...slide, layers: slide.layers.filter((l) => !selectedIds.includes(l.id)) } : slide));
    setSelectedIds([]);
    commitSlides(next);
  }, [slides, activeIndex, activeSlide, selectedIds, commitSlides]);

  const duplicateSelected = useCallback(() => {
    if (!activeSlide || !selectedIds.length) return;
    const clones = activeSlide.layers.filter((l) => selectedIds.includes(l.id)).map((l) => ({ ...l, id: newLayerId(), x: l.x + 24, y: l.y + 24 }));
    const next = slides.map((slide, idx) => (idx === activeIndex ? { ...slide, layers: [...slide.layers, ...clones] } : slide));
    setSelectedIds(clones.map((c) => c.id));
    commitSlides(next);
  }, [slides, activeIndex, activeSlide, selectedIds, commitSlides]);

  const reorderSelected = useCallback((direction: "front" | "back") => {
    if (!activeSlide || selectedIds.length !== 1) return;
    const id0 = selectedIds[0]!;
    const layers = activeSlide.layers;
    const layer = layers.find((l) => l.id === id0);
    if (!layer) return;
    const rest = layers.filter((l) => l.id !== id0);
    const reordered = direction === "front" ? [...rest, layer] : [layer, ...rest];
    const next = slides.map((slide, idx) => (idx === activeIndex ? { ...slide, layers: reordered } : slide));
    commitSlides(next);
  }, [slides, activeIndex, activeSlide, selectedIds, commitSlides]);

  const updateActiveSlide = useCallback((patch: Partial<Slide>) => {
    const next = slides.map((slide, idx) => (idx === activeIndex ? { ...slide, ...patch } : slide));
    commitSlides(next);
  }, [slides, activeIndex, commitSlides]);

  const updateSelectedLayer = useCallback((patch: Partial<SlideLayer>) => {
    if (selectedIds.length !== 1) return;
    patchLayers({ [selectedIds[0]!]: patch });
  }, [selectedIds, patchLayers]);

  const addSlide = useCallback(() => {
    const slide = blankSlide(newSlideId(), `Slide ${slides.length + 1}`);
    const next = [...slides.slice(0, activeIndex + 1), slide, ...slides.slice(activeIndex + 1)];
    setActiveIndex(activeIndex + 1);
    setSelectedIds([]);
    commitSlides(next);
  }, [slides, activeIndex, commitSlides]);

  const duplicateSlide = useCallback((index: number) => {
    const clone = cloneWithNewIds(slides[index]!);
    const next = [...slides.slice(0, index + 1), clone, ...slides.slice(index + 1)];
    setActiveIndex(index + 1);
    commitSlides(next);
  }, [slides, commitSlides]);

  const deleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, idx) => idx !== index);
    setActiveIndex(Math.min(index, next.length - 1));
    setSelectedIds([]);
    commitSlides(next);
  }, [slides, commitSlides]);

  const moveSlide = useCallback((index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed!);
    setActiveIndex(target);
    commitSlides(next);
  }, [slides, commitSlides]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, deleteSelected]);

  if (status === "loading") return <div className="p-10 text-center text-[10px] text-black/40">Loading presentation…</div>;
  if (status === "not-found") return <div className="p-10 text-center text-[10px] text-black/40">Presentation not found, or you don&apos;t have access.</div>;

  const statusLabel: Record<SaveStatus, string> = {
    conflict: "Newer version available — edits kept locally", loading: "", saved: "Saved", pending: "Saving…", saving: "Saving…", error: errorMessage ?? "Could not save", "not-found": "",
  };
  const selectedLayer = selectedIds.length === 1 ? activeSlide?.layers.find((l) => l.id === selectedIds[0]) : undefined;

  return (
    <div className="flex h-full flex-col">
      {status === "conflict" && <div role="alert" className="border-b bg-amber-50 p-3 text-sm">
        <p>{errorMessage}</p>
        <button type="button" className="mr-4 underline" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify({ title, slides: slidesRef.current, ...dimsRef.current }, null, 2)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `kebu-${id}-recovery.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Download my edits</button>
        <button type="button" className="underline" onClick={() => { if (window.confirm("Reload the latest version? Download your edits first; reloading discards this local copy.")) window.location.reload(); }}>Reload latest</button>
      </div>}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5" style={{ borderColor: KEBU.border }}>
        <div className="flex items-center gap-3">
          <Link href="/library?view=slides" className="text-[9px] text-black/35">← Library</Link>
          <input
            aria-label="Presentation title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const nextTitle = title.trim();
              if (!loadedRef.current || conflictRef.current || nextTitle === savedTitleRef.current) return;
              void fetch("/api/library/nodes", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title: nextTitle, ...(titleRevisionRef.current ? { expectedUpdatedAt: titleRevisionRef.current } : {}) }) }).then(async response => {
                const data = await response.json().catch(() => ({}));
                if (response.status === 409) { conflictRef.current = true; setStatus("conflict"); setErrorMessage("The title changed elsewhere. Download your edits before reloading."); return; }
                if (!response.ok) throw new Error("Could not save title. Your changes are kept here.");
                titleRevisionRef.current = data.node.updated_at;
                savedTitleRef.current = nextTitle;
              }).catch(cause => { setErrorMessage(cause.message); setStatus("error"); });
            }}
            className="border-none text-[13px] font-semibold outline-none"
          />
          <span role="status" className="text-[9px]" style={{ color: status === "error" ? KEBU.red : "rgba(10,10,10,0.35)" }}>{statusLabel[status]}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/library/slides/${id}/export?format=pdf`} download className="rounded-full border px-3 py-1 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>Export PDF</a>
          <a href={`/api/library/slides/${id}/export?format=pptx`} download className="rounded-full border px-3 py-1 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>Export PPTX</a>
          <button type="button" data-testid="present-button" onClick={() => setPresenting(true)} className="rounded-full bg-black px-3 py-1 text-[9px] font-semibold text-white">▶ Present</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Slide thumbnails */}
        <aside className="w-[150px] shrink-0 overflow-y-auto border-r p-2" style={{ borderColor: KEBU.border }}>
          {slides.map((slide, idx) => (
            <div key={slide.id} className="group relative mb-2">
              <button
                type="button"
                data-testid={`slide-thumb-${idx}`}
                onClick={() => { setActiveIndex(idx); setSelectedIds([]); }}
                className="relative block aspect-video w-full overflow-hidden rounded-md border"
                style={{ borderColor: idx === activeIndex ? KEBU.orange : KEBU.border, borderWidth: idx === activeIndex ? 2 : 1 }}
              >
                <div className="pointer-events-none absolute inset-0" style={{ background: slide.backgroundColor }} />
                <span className="absolute bottom-0.5 right-1 text-[7px] text-black/40">{idx + 1}</span>
              </button>
              <div className="mt-0.5 flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button type="button" aria-label="Move slide up" onClick={() => moveSlide(idx, -1)} className="text-[8px] text-black/40">↑</button>
                <button type="button" aria-label="Duplicate slide" onClick={() => duplicateSlide(idx)} className="text-[8px] text-black/40">⧉</button>
                <button type="button" aria-label="Delete slide" onClick={() => deleteSlide(idx)} className="text-[8px] text-black/40">✕</button>
                <button type="button" aria-label="Move slide down" onClick={() => moveSlide(idx, 1)} className="text-[8px] text-black/40">↓</button>
              </div>
            </div>
          ))}
          <button type="button" data-testid="add-slide" onClick={addSlide} className="mt-1 w-full rounded-md border py-1.5 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>+ Slide</button>
        </aside>

        {/* Canvas */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 border-b px-3 py-1.5" style={{ borderColor: KEBU.border }}>
            {(["text", "rect", "ellipse", "line", "image"] as SlideLayerType[]).map((type) => (
              <button key={type} type="button" data-testid={`add-layer-${type}`} onClick={() => addLayer(type)} className="rounded-full border px-2.5 py-1 text-[9px] font-semibold capitalize" style={{ borderColor: KEBU.border }}>
                + {type}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-black/10" />
            <button type="button" disabled={!selectedIds.length} onClick={duplicateSelected} className="rounded-full border px-2.5 py-1 text-[9px] font-semibold disabled:opacity-30" style={{ borderColor: KEBU.border }}>Duplicate</button>
            <button type="button" disabled={selectedIds.length !== 1} onClick={() => reorderSelected("front")} className="rounded-full border px-2.5 py-1 text-[9px] font-semibold disabled:opacity-30" style={{ borderColor: KEBU.border }}>To front</button>
            <button type="button" disabled={selectedIds.length !== 1} onClick={() => reorderSelected("back")} className="rounded-full border px-2.5 py-1 text-[9px] font-semibold disabled:opacity-30" style={{ borderColor: KEBU.border }}>To back</button>
            <button type="button" data-testid="delete-layer" disabled={!selectedIds.length} onClick={deleteSelected} className="rounded-full border px-2.5 py-1 text-[9px] font-semibold disabled:opacity-30" style={{ borderColor: KEBU.border }}>Delete</button>
          </div>
          <div className="min-h-0 flex-1 p-4">
            {activeSlide ? (
              <SlideCanvas
                slide={activeSlide}
                deckWidth={deckWidth}
                deckHeight={deckHeight}
                selectedIds={selectedIds}
                onSelect={setSelectedIds}
                onPatchLayers={patchLayers}
              />
            ) : null}
          </div>
        </div>

        {/* Inspector */}
        <aside className="w-[220px] shrink-0 overflow-y-auto border-l p-3" style={{ borderColor: KEBU.border }}>
          {selectedLayer ? (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">{selectedLayer.type}</p>
              {selectedLayer.type === "text" ? (
                <>
                  <textarea aria-label="Layer text" value={selectedLayer.text ?? ""} onChange={(e) => updateSelectedLayer({ text: e.target.value })} rows={3} className="w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }} />
                  <label className="block text-[9px] text-black/40">Font size<input type="number" aria-label="Font size" value={selectedLayer.fontSize ?? 24} onChange={(e) => updateSelectedLayer({ fontSize: Number(e.target.value) || 1 })} className="mt-0.5 w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }} /></label>
                  <label className="block text-[9px] text-black/40">Color<input type="color" aria-label="Text color" value={selectedLayer.color ?? "#111111"} onChange={(e) => updateSelectedLayer({ color: e.target.value })} className="mt-0.5 h-7 w-full rounded border" style={{ borderColor: KEBU.border }} /></label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => updateSelectedLayer({ fontWeight: selectedLayer.fontWeight === "bold" ? "normal" : "bold" })} className="flex-1 rounded border py-1 text-[10px] font-bold" style={{ borderColor: KEBU.border, background: selectedLayer.fontWeight === "bold" ? KEBU.orange : undefined }}>B</button>
                    <button type="button" onClick={() => updateSelectedLayer({ fontStyle: selectedLayer.fontStyle === "italic" ? "normal" : "italic" })} className="flex-1 rounded border py-1 text-[10px] italic" style={{ borderColor: KEBU.border, background: selectedLayer.fontStyle === "italic" ? KEBU.orange : undefined }}>I</button>
                  </div>
                </>
              ) : null}
              {selectedLayer.type === "rect" || selectedLayer.type === "ellipse" ? (
                <>
                  <label className="block text-[9px] text-black/40">Fill<input type="color" aria-label="Fill color" value={selectedLayer.fill ?? "#FF6A00"} onChange={(e) => updateSelectedLayer({ fill: e.target.value })} className="mt-0.5 h-7 w-full rounded border" style={{ borderColor: KEBU.border }} /></label>
                  <label className="block text-[9px] text-black/40">Stroke width<input type="number" aria-label="Stroke width" min={0} value={selectedLayer.strokeWidth ?? 0} onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) || 0 })} className="mt-0.5 w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }} /></label>
                </>
              ) : null}
              {selectedLayer.type === "line" ? (
                <label className="block text-[9px] text-black/40">Stroke<input type="color" aria-label="Line color" value={selectedLayer.stroke ?? "#111111"} onChange={(e) => updateSelectedLayer({ stroke: e.target.value })} className="mt-0.5 h-7 w-full rounded border" style={{ borderColor: KEBU.border }} /></label>
              ) : null}
              {selectedLayer.type === "image" ? (
                <label className="block text-[9px] text-black/40">Image URL<input aria-label="Image URL" value={selectedLayer.imageUrl ?? ""} onChange={(e) => updateSelectedLayer({ imageUrl: e.target.value })} placeholder="https://…" className="mt-0.5 w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }} /></label>
              ) : null}
              <label className="block text-[9px] text-black/40">Rotation<input type="number" aria-label="Rotation" value={Math.round(selectedLayer.rotation)} onChange={(e) => updateSelectedLayer({ rotation: Number(e.target.value) || 0 })} className="mt-0.5 w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }} /></label>
            </div>
          ) : activeSlide ? (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Slide</p>
              <label className="block text-[9px] text-black/40">Background<input type="color" aria-label="Slide background" value={activeSlide.backgroundColor} onChange={(e) => updateActiveSlide({ backgroundColor: e.target.value })} className="mt-0.5 h-7 w-full rounded border" style={{ borderColor: KEBU.border }} /></label>
              <label className="block text-[9px] text-black/40">Transition
                <select aria-label="Transition" value={activeSlide.transitionKind} onChange={(e) => updateActiveSlide({ transitionKind: e.target.value as SlideTransition })} className="mt-0.5 w-full rounded border px-2 py-1 text-[11px]" style={{ borderColor: KEBU.border }}>
                  <option value="cut">Cut</option>
                  <option value="fade">Fade</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="slide">Slide</option>
                </select>
              </label>
            </div>
          ) : null}
        </aside>
      </div>

      {presenting ? (
        <PresentMode slides={slides} deckWidth={deckWidth} deckHeight={deckHeight} startIndex={activeIndex} onExit={() => setPresenting(false)} />
      ) : null}
    </div>
  );
}

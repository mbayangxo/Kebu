import { afterEach, describe, expect, it, vi } from "vitest";
import { exportCanvasMotionToWebmBlob } from "@/lib/studio/motion-export";
import { exportStudioComposition } from "@/lib/studio/composition-browser-export";
import { emptyStudioComposition } from "@/lib/studio/composition";
import { canvasLayerSchema, emptyCanvasDocument, exportCanvasToPngDataUrlAsync } from "@/lib/studio/canvas-document";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function canvasContext() { return new Proxy({}, { get: (_target, key) => key === "measureText" ? () => ({ width: 40 }) : () => undefined }); }

describe("Studio export output integrity", () => {
  it("flushes encoded frames before stopping the capture stream", async () => {
    vi.useFakeTimers(); const events: string[] = []; let ended = false;
    const track = { stop: () => { ended = true; events.push("track-stop"); }, requestFrame: () => events.push("frame") };
    const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
    vi.stubGlobal("window", { setTimeout });
    vi.stubGlobal("document", { createElement: () => ({ getContext: canvasContext, captureStream: () => stream }) });
    class Recorder {
      static isTypeSupported() { return true; }
      state = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        setTimeout(() => { events.push("flush"); this.ondataavailable?.({ data: new Blob(ended ? [] : ["encoded frames"]) }); this.onstop?.(); }, 10);
      }
    }
    vi.stubGlobal("MediaRecorder", Recorder);
    const recording = exportStudioComposition(emptyStudioComposition({ width: 200, height: 200 }), { fps: 8 });
    await vi.advanceTimersByTimeAsync(6000); const output = await recording;
    expect("blob" in output && output.blob.size).toBeGreaterThan(0);
    expect(events.indexOf("flush")).toBeLessThan(events.indexOf("track-stop"));
    expect(events).toContain("frame");
  });

  it("closes timeline capture tracks if the encoder constructor fails", async () => {
    const stop = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ getContext: canvasContext, toDataURL: () => "encoded", captureStream: () => ({ getTracks: () => [{ stop }], getVideoTracks: () => [] }) }) });
    class LoadedImage { onload: (() => void) | null = null; set src(_url: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal("Image", LoadedImage);
    class RefusedRecorder { static isTypeSupported() { return true; } constructor() { throw new Error("Encoder unavailable"); } }
    vi.stubGlobal("MediaRecorder", RefusedRecorder);
    expect(await exportCanvasMotionToWebmBlob(emptyCanvasDocument({ width: 200, height: 200 }))).toEqual({ error: "Encoder unavailable" });
    expect(stop).toHaveBeenCalledOnce();
  });

  it("refuses a PNG with unavailable visible image media", async () => {
    const encode = vi.fn(() => "data:image/png;base64,encoded");
    vi.stubGlobal("document", { createElement: () => ({ getContext: canvasContext, toDataURL: encode }) });
    class MissingImage {
      onerror: (() => void) | null = null;
      set src(_url: string) { queueMicrotask(() => this.onerror?.()); }
    }
    vi.stubGlobal("Image", MissingImage);
    const doc = emptyCanvasDocument({ width: 200, height: 200 });
    doc.pages[0]!.layers = [canvasLayerSchema.parse({ id: "missing", type: "image", x: 0, y: 0, width: 100, height: 100, imageUrl: "https://example.test/missing.png" })];
    expect(await exportCanvasToPngDataUrlAsync(doc)).toBeNull(); expect(encode).not.toHaveBeenCalled();
  });

  it("refuses visible media without a URL but permits intentionally hidden media", async () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: canvasContext, toDataURL: () => "encoded" }) });
    const doc = emptyCanvasDocument({ width: 200, height: 200 });
    const layer = canvasLayerSchema.parse({ id: "empty", type: "image", x: 0, y: 0, width: 100, height: 100 });
    doc.pages[0]!.layers = [layer]; expect(await exportCanvasToPngDataUrlAsync(doc)).toBeNull();
    doc.pages[0]!.layers = [{ ...layer, opacity: 0 }]; expect(await exportCanvasToPngDataUrlAsync(doc)).toBe("encoded");
  });

  it("returns a render failure when browser canvas encoding refuses access", async () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: canvasContext, toDataURL: () => { throw new DOMException("tainted", "SecurityError"); } }) });
    expect(await exportCanvasToPngDataUrlAsync(emptyCanvasDocument({ width: 200, height: 200 }))).toBeNull();
  });
});

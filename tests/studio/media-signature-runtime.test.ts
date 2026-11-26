import { describe, expect, it } from "vitest";
import { sniffStudioMedia } from "@/lib/studio/media-signature";
describe("Studio binary media signatures", () => {
  it("recognizes binary WebM instead of decoding its header as UTF-8", () => {
    const bytes = Uint8Array.from([0x1a,0x45,0xdf,0xa3]);
    expect(sniffStudioMedia(bytes,"video/webm")).toBe("video/webm");
    expect(sniffStudioMedia(bytes,"audio/webm")).toBe("audio/webm");
  });
  it("distinguishes WAV and WebP by the RIFF form instead of trusting MIME", () => {
    const bytes = new TextEncoder().encode("RIFF0000WAVE");
    expect(sniffStudioMedia(bytes,"image/webp")).toBe("audio/wav");
    expect(sniffStudioMedia(new TextEncoder().encode("RIFF0000WEBP"),"audio/wav")).toBe("image/webp");
    expect(sniffStudioMedia(new TextEncoder().encode("RIFF0000FAKE"),"audio/wav")).toBeNull();
  });
  it("refuses truncated PNG and GIF signatures", () => {
    expect(sniffStudioMedia(Uint8Array.from([0x89,0x50,0x4e,0x47]),"image/png")).toBeNull();
    expect(sniffStudioMedia(new TextEncoder().encode("GIF8"),"image/gif")).toBeNull();
  });
  it("recognizes ADTS AAC separately from MPEG audio frames", () => {
    expect(sniffStudioMedia(Uint8Array.from([0xff,0xf1]),"audio/aac")).toBe("audio/aac");
    expect(sniffStudioMedia(Uint8Array.from([0xff,0xfb]),"audio/mpeg")).toBe("audio/mpeg");
  });
});

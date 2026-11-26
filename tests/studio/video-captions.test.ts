import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCaptionSegments, normalizeCaptionSegments, segmentsFromPlainTranscript } from "@/lib/studio/captions";
import { emptyStudioComposition } from "@/lib/studio/composition";

describe("caption segment helpers — pure functions, real behavior", () => {
  it("drops empty, whitespace-only, and inverted-timing segments", () => {
    const cleaned = normalizeCaptionSegments([
      { startMs: 1000, endMs: 2000, text: "Real line" },
      { startMs: 500, endMs: 500, text: "Zero duration" },
      { startMs: 2000, endMs: 1000, text: "Inverted" },
      { startMs: 0, endMs: 100, text: "   " },
    ]);
    expect(cleaned).toEqual([{ startMs: 1000, endMs: 2000, text: "Real line" }]);
  });

  it("sorts by start time and truncates overlong text", () => {
    const cleaned = normalizeCaptionSegments([
      { startMs: 5000, endMs: 6000, text: "second" },
      { startMs: 1000, endMs: 2000, text: "a".repeat(600) },
    ]);
    expect(cleaned.map((s) => s.startMs)).toEqual([1000, 5000]);
    expect(cleaned[0]!.text.length).toBe(500);
  });

  it("applies real segments onto the project's caption track, leaving other tracks untouched", () => {
    const comp = emptyStudioComposition({ width: 1080, height: 1920 });
    const captionTrack = comp.tracks.find((t) => t.kind === "caption")!;
    expect(captionTrack).toBeDefined();

    const next = applyCaptionSegments(comp, [{ startMs: 0, endMs: 1500, text: "Hello world" }]);
    if ("error" in next) throw new Error(next.error);

    const captionClips = next.clips.filter((c) => c.trackId === captionTrack.id);
    expect(captionClips).toHaveLength(1);
    expect(captionClips[0]!.captionText).toBe("Hello world");
    expect(captionClips[0]!.durationMs).toBe(1500);
  });

  it("replaces previous caption clips instead of stacking duplicates on reapply", () => {
    const comp = emptyStudioComposition({ width: 1080, height: 1920 });
    const first = applyCaptionSegments(comp, [{ startMs: 0, endMs: 1000, text: "old" }]);
    if ("error" in first) throw new Error(first.error);
    const second = applyCaptionSegments(first, [{ startMs: 0, endMs: 1000, text: "new" }]);
    if ("error" in second) throw new Error(second.error);

    const captionTrack = second.tracks.find((t) => t.kind === "caption")!;
    const captionClips = second.clips.filter((c) => c.trackId === captionTrack.id);
    expect(captionClips).toHaveLength(1);
    expect(captionClips[0]!.captionText).toBe("new");
  });

  it("fails honestly when the composition has no caption track at all", () => {
    const comp = emptyStudioComposition({ width: 1080, height: 1920 });
    const noCaption = { ...comp, tracks: comp.tracks.filter((t) => t.kind !== "caption") };
    const result = applyCaptionSegments(noCaption as typeof comp, [{ startMs: 0, endMs: 1000, text: "x" }]);
    expect(result).toEqual({ error: "No caption track on this project." });
  });

  it("splits a plain transcript into sentence-sized segments spanning the real duration, in order", () => {
    const segments = segmentsFromPlainTranscript("First sentence. Second sentence! Third?", 9000);
    expect(segments).toHaveLength(3);
    expect(segments[0]!.text).toBe("First sentence.");
    expect(segments[segments.length - 1]!.endMs).toBeLessThanOrEqual(9000);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.startMs).toBeGreaterThanOrEqual(segments[i - 1]!.endMs - 1);
    }
  });
});

const deps = vi.hoisted(() => ({
  auth: vi.fn(),
  workspace: vi.fn(),
  trustedMedia: vi.fn(),
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/account/server-workspace", () => ({ loadActiveWorkspaceScope: deps.workspace }));
vi.mock("@/lib/studio/trusted-media", () => ({ resolveTrustedStudioMedia: deps.trustedMedia }));

import { POST } from "@/app/api/studio/video/[id]/captions/route";
import { emptyStudioComposition as realEmptyComposition } from "@/lib/studio/composition";

const context = { params: Promise.resolve({ id: "video-1" }) };
function request(body: unknown) {
  return new Request("https://kebu.test/api/studio/video/video-1/captions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://kebu.test", Host: "kebu.test" },
    body: JSON.stringify(body),
  });
}

function database(composition: ReturnType<typeof realEmptyComposition>) {
  const row = { id: "video-1", composition, business_id: null, updated_at: "2026-10-27T00:00:00.000Z" };
  const read = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
  for (const fn of [read.select, read.eq, read.is]) fn.mockReturnValue(read);
  read.maybeSingle.mockResolvedValue({ data: row, error: null });

  const write = { update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  for (const fn of [write.update, write.eq, write.is, write.select]) fn.mockReturnValue(write);
  write.maybeSingle.mockResolvedValue({ data: { ...row, updated_at: "2026-10-27T00:01:00.000Z" }, error: null });

  const supabase = { from: vi.fn(() => ({ select: read.select, update: write.update })) };
  deps.auth.mockResolvedValue({ user: { id: "owner-1" }, supabase });
  return { write };
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.workspace.mockResolvedValue({ activeBusinessId: null });
  // Test-only guard: a real Whisper call here would be a live external request.
  global.fetch = vi.fn(() => {
    throw new Error("No live provider call is permitted from this test — real Whisper key is honestly absent.");
  });
});

describe("POST /api/studio/video/[id]/captions — real route behavior, no live provider calls", () => {
  it("refuses Whisper transcription honestly (503, ASR_NOT_CONFIGURED) when OPENAI_API_KEY is absent, without ever calling fetch", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      database(realEmptyComposition({ width: 1080, height: 1920 }));
      const res = await POST(request({ useWhisper: true }), context);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe("ASR_NOT_CONFIGURED");
      expect(body.error).toMatch(/OPENAI_API_KEY/);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });

  it("applies pre-timed segments for real and persists them on the composition", async () => {
    const { write } = database(realEmptyComposition({ width: 1080, height: 1920 }));
    const res = await POST(
      request({ segments: [{ startMs: 0, endMs: 1200, text: "Real caption line" }] }),
      context,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("segments");
    expect(body.captionCount).toBe(1);
    expect(write.update).toHaveBeenCalled();
    const updatedComposition = (write.update.mock.calls[0]![0] as { composition: ReturnType<typeof realEmptyComposition> }).composition;
    const captionTrackId = updatedComposition.tracks.find((t) => t.kind === "caption")!.id;
    expect(updatedComposition.clips.some((c) => c.trackId === captionTrackId && c.captionText === "Real caption line")).toBe(true);
  });

  it("derives timed segments from a pasted transcript", async () => {
    database(realEmptyComposition({ width: 1080, height: 1920 }));
    const res = await POST(request({ transcript: "One sentence. Two sentences." }), context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("transcript");
    expect(body.captionCount).toBe(2);
  });

  it("rejects a request with no transcript, segments, or Whisper request", async () => {
    database(realEmptyComposition({ width: 1080, height: 1920 }));
    const res = await POST(request({}), context);
    expect(res.status).toBe(400);
  });

  it("refuses a caption write made against a stale composition revision", async () => {
    const { write } = database(realEmptyComposition({ width: 1080, height: 1920 }));
    write.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(
      request({
        segments: [{ startMs: 0, endMs: 1000, text: "x" }],
        expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
      }),
      context,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("studio_video_version_conflict");
  });
});

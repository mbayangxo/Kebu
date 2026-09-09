import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { parseStudioComposition, compositionDurationMs } from "@/lib/studio/composition";
import {
  applyCaptionSegments,
  segmentsFromPlainTranscript,
  type CaptionSegment,
} from "@/lib/studio/captions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  /** Paste / manual transcript — timed evenly across soundtrack or composition length */
  transcript: z.string().trim().min(1).max(20_000).optional(),
  /** Pre-timed segments (from Whisper or external ASR) */
  segments: z
    .array(
      z.object({
        startMs: z.number().int().min(0).max(600_000),
        endMs: z.number().int().min(0).max(600_000),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .max(200)
    .optional(),
  /** When true and OPENAI_API_KEY set, transcribe soundtrack URL via Whisper */
  useWhisper: z.boolean().optional().default(false),
});

/**
 * Auto / assisted captions → caption track clips on the same composition.
 * Honest: Whisper only when OPENAI_API_KEY is configured; otherwise transcript/segments required.
 */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid caption input." }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("studio_video_projects")
    .select("id, composition")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Video project not found." }, { status: 404 });
  }

  let composition;
  try {
    composition = parseStudioComposition(project.composition);
  } catch {
    return NextResponse.json({ error: "Invalid composition on project." }, { status: 500 });
  }

  let segments: CaptionSegment[] = parsed.data.segments ?? [];

  if (parsed.data.useWhisper) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Auto captions (Whisper) need OPENAI_API_KEY on the server. Paste a transcript instead, or add timed segments.",
          code: "ASR_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const soundtrackUrl =
      composition.music?.soundtrackUrl ||
      composition.clips.find((c) => c.sourceUrl && c.sourceUrl.length > 8)?.sourceUrl;
    if (!soundtrackUrl || typeof soundtrackUrl !== "string") {
      return NextResponse.json(
        { error: "Add a soundtrack or video clip before Whisper auto captions." },
        { status: 400 },
      );
    }

    try {
      const mediaRes = await fetch(soundtrackUrl);
      if (!mediaRes.ok) {
        return NextResponse.json({ error: "Could not fetch media for transcription." }, { status: 502 });
      }
      const blob = await mediaRes.blob();
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "segment");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const whisperJson = (await whisperRes.json().catch(() => ({}))) as {
        error?: { message?: string };
        segments?: { start?: number; end?: number; text?: string }[];
        text?: string;
      };
      if (!whisperRes.ok) {
        return NextResponse.json(
          {
            error: whisperJson.error?.message ?? "Whisper transcription failed.",
            code: "ASR_FAILED",
          },
          { status: 502 },
        );
      }
      if (Array.isArray(whisperJson.segments) && whisperJson.segments.length) {
        segments = whisperJson.segments.map((s) => ({
          startMs: Math.round((s.start ?? 0) * 1000),
          endMs: Math.round((s.end ?? (s.start ?? 0) + 2) * 1000),
          text: (s.text ?? "").trim(),
        }));
      } else if (whisperJson.text) {
        segments = segmentsFromPlainTranscript(
          whisperJson.text,
          compositionDurationMs(composition),
        );
      }
    } catch {
      return NextResponse.json({ error: "Whisper request failed.", code: "ASR_FAILED" }, { status: 502 });
    }
  } else if (parsed.data.transcript) {
    segments = segmentsFromPlainTranscript(
      parsed.data.transcript,
      composition.music?.durationMs ?? compositionDurationMs(composition),
    );
  }

  if (!segments.length) {
    return NextResponse.json(
      {
        error:
          "Provide transcript, timed segments, or useWhisper:true with OPENAI_API_KEY configured.",
      },
      { status: 400 },
    );
  }

  const next = applyCaptionSegments(composition, segments);
  if ("error" in next) {
    return NextResponse.json({ error: next.error }, { status: 400 });
  }

  const { data: updated, error: upErr } = await supabase
    .from("studio_video_projects")
    .update({ composition: next, edit_mode: next.editMode })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, title, width, height, frame_rate, edit_mode, composition, updated_at")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ error: "Could not save captions." }, { status: 500 });
  }

  return NextResponse.json({
    project: updated,
    captionCount: segments.length,
    source: parsed.data.useWhisper ? "whisper" : parsed.data.segments ? "segments" : "transcript",
  });
}

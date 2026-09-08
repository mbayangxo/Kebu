/**
 * Studio V3 — AI music editing commands (natural language → composition edits).
 * Honest: rule + beat/section intelligence — not a generative DAW.
 */
import {
  everyNthBeat,
  newCompositionId,
  splitClipAt,
  studioCompositionSchema,
  updateClip,
  type MusicSection,
  type StudioComposition,
} from "@/lib/studio/composition";

export type AiMusicEditResult =
  | { ok: true; composition: StudioComposition; summary: string }
  | { ok: false; error: string };

export type AiMusicCommand =
  | { kind: "cut_every_n_beats"; n: number; clipId?: string }
  | { kind: "markers_every_n_beats"; n: number }
  | { kind: "use_chorus"; clipId?: string }
  | { kind: "chorus_climax_marker" }
  | { kind: "photos_every_n_beats"; n: number }
  | { kind: "detect_sections" };

const CUT_EVERY = /(?:cut|split|edit).*(?:every|each)\s+(\d+)\s*beats?/i;
const EVERY_N = /every\s+(\d+)\s*beats?/i;
const CHORUS = /chorus|climax|drop/i;
const USE_CHORUS = /(?:use|keep|focus).*(chorus)|chorus.*(?:only|section)/i;
const PHOTOS = /photos?|images?|stills?/i;
const DETECT = /detect|find|label|section/i;

export function parseAiMusicCommand(prompt: string): AiMusicCommand | { error: string } {
  const text = prompt.trim();
  if (!text) return { error: "Describe the edit (e.g. “cut every 4 beats”)." };

  if (DETECT.test(text) && /section|structure|verse|chorus/i.test(text)) {
    return { kind: "detect_sections" };
  }
  if (USE_CHORUS.test(text)) return { kind: "use_chorus" };
  if (CHORUS.test(text) && /marker|mark|flag/i.test(text)) {
    return { kind: "chorus_climax_marker" };
  }
  const cut = text.match(CUT_EVERY);
  if (cut) return { kind: "cut_every_n_beats", n: Math.max(1, Number(cut[1]) || 4) };
  if (PHOTOS.test(text)) {
    const m = text.match(EVERY_N);
    return { kind: "photos_every_n_beats", n: Math.max(1, Number(m?.[1]) || 2) };
  }
  const every = text.match(EVERY_N);
  if (every) return { kind: "markers_every_n_beats", n: Math.max(1, Number(every[1]) || 4) };
  if (CHORUS.test(text)) return { kind: "chorus_climax_marker" };

  return {
    error:
      "Try: “cut every 4 beats”, “mark every 4 beats”, “use the chorus”, “chorus climax”, “photos every 2 beats”, or “detect sections”.",
  };
}

/** Heuristic sections from energy curve (V3) — labeled, not AI-invented certainty. */
export function detectSectionsFromEnergy(
  energyMs: number[],
  energyValues: number[],
  durationMs: number,
): MusicSection[] {
  if (energyMs.length < 4 || durationMs < 4000) {
    return [
      {
        id: newCompositionId("sec"),
        label: "other",
        startMs: 0,
        endMs: durationMs,
      },
    ];
  }
  const mid = energyValues.reduce((s, v) => s + v, 0) / energyValues.length;
  const high = mid * 1.15;
  const sections: MusicSection[] = [];
  let i = 0;
  while (i < energyMs.length) {
    const hot = energyValues[i]! >= high;
    let j = i + 1;
    while (j < energyMs.length && energyValues[j]! >= high === hot) j++;
    const startMs = energyMs[i]!;
    const endMs = j < energyMs.length ? energyMs[j]! : durationMs;
    const label: MusicSection["label"] =
      startMs < durationMs * 0.12
        ? "intro"
        : endMs > durationMs * 0.88
          ? "outro"
          : hot
            ? "chorus"
            : "verse";
    sections.push({
      id: newCompositionId("sec"),
      label,
      startMs,
      endMs,
    });
    i = j;
  }
  return sections.slice(0, 64);
}

function primaryVideoClip(c: StudioComposition, clipId?: string) {
  if (clipId) return c.clips.find((cl) => cl.id === clipId) ?? null;
  const v1 = c.tracks.find((t) => t.kind === "video");
  if (!v1) return c.clips[0] ?? null;
  return c.clips.find((cl) => cl.trackId === v1.id) ?? c.clips[0] ?? null;
}

export function applyAiMusicCommand(
  c: StudioComposition,
  prompt: string,
  opts?: { clipId?: string },
): AiMusicEditResult {
  const parsed = parseAiMusicCommand(prompt);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const beats = c.music?.beatsMs ?? [];
  const durationMs = c.music?.durationMs ?? Math.max(...c.clips.map((cl) => cl.startMs + cl.durationMs), 5000);

  if (parsed.kind === "detect_sections") {
    if (!c.music?.energyMs?.length) {
      return { ok: false, error: "Upload a soundtrack so Kebu can estimate sections from energy." };
    }
    const sections = detectSectionsFromEnergy(
      c.music.energyMs,
      c.music.energyValues,
      c.music.durationMs ?? durationMs,
    );
    const next = studioCompositionSchema.parse({
      ...c,
      music: { ...c.music, sections },
    });
    return {
      ok: true,
      composition: next,
      summary: `Detected ${sections.length} sections from energy (heuristic — verify labels).`,
    };
  }

  if (parsed.kind === "markers_every_n_beats" || parsed.kind === "photos_every_n_beats") {
    if (beats.length < 2) return { ok: false, error: "Need a soundtrack with beats first." };
    const times = everyNthBeat(beats, parsed.n);
    const label = parsed.kind === "photos_every_n_beats" ? "Photo" : `Beat×${parsed.n}`;
    const markers = [
      ...c.markers,
      ...times.map((timeMs, i) => ({
        id: newCompositionId("mk"),
        timeMs,
        label: `${label} ${i + 1}`,
      })),
    ].slice(0, 200);
    return {
      ok: true,
      composition: studioCompositionSchema.parse({ ...c, markers }),
      summary:
        parsed.kind === "photos_every_n_beats"
          ? `Marked ${times.length} photo beats (every ${parsed.n}). Place stills on those markers.`
          : `Added ${times.length} markers every ${parsed.n} beats.`,
    };
  }

  if (parsed.kind === "chorus_climax_marker") {
    let timeMs = 0;
    const chorus = c.music?.sections?.find((s) => s.label === "chorus");
    if (chorus) {
      timeMs = Math.round((chorus.startMs + chorus.endMs) / 2);
    } else if (c.music?.energyMs?.length && c.music.energyValues?.length) {
      let bestI = 0;
      let best = -1;
      for (let i = 0; i < c.music.energyValues.length; i++) {
        if (c.music.energyValues[i]! > best) {
          best = c.music.energyValues[i]!;
          bestI = i;
        }
      }
      timeMs = c.music.energyMs[bestI]!;
    } else if (beats.length) {
      timeMs = beats[Math.floor(beats.length * 0.55)]!;
    } else {
      return { ok: false, error: "Add soundtrack (and ideally detect sections) first." };
    }
    const markers = [
      ...c.markers,
      { id: newCompositionId("mk"), timeMs, label: "Chorus climax" },
    ].slice(0, 200);
    return {
      ok: true,
      composition: studioCompositionSchema.parse({ ...c, markers }),
      summary: `Marked chorus climax at ${(timeMs / 1000).toFixed(1)}s.`,
    };
  }

  if (parsed.kind === "use_chorus") {
    let chorus = c.music?.sections?.find((s) => s.label === "chorus");
    if (!chorus && c.music?.energyMs?.length) {
      const sections = detectSectionsFromEnergy(
        c.music.energyMs,
        c.music.energyValues,
        c.music.durationMs ?? durationMs,
      );
      c = studioCompositionSchema.parse({
        ...c,
        music: { ...c.music!, sections },
      });
      chorus = sections.find((s) => s.label === "chorus");
    }
    if (!chorus) return { ok: false, error: "Could not find a chorus section yet." };
    const clip = primaryVideoClip(c, opts?.clipId ?? parsed.clipId);
    if (!clip) return { ok: false, error: "Add a video clip first." };
    const updated = updateClip(c, clip.id, {
      sourceInMs: Math.max(0, chorus.startMs),
      durationMs: Math.max(500, chorus.endMs - chorus.startMs),
      startMs: 0,
    });
    if ("error" in updated) return { ok: false, error: updated.error };
    return {
      ok: true,
      composition: updated,
      summary: `Trimmed clip to chorus (${((chorus.endMs - chorus.startMs) / 1000).toFixed(1)}s).`,
    };
  }

  if (parsed.kind === "cut_every_n_beats") {
    if (beats.length < 3) return { ok: false, error: "Need a soundtrack with beats first." };
    const clip = primaryVideoClip(c, opts?.clipId ?? parsed.clipId);
    if (!clip) return { ok: false, error: "Select or add a video clip to cut." };
    const cuts = everyNthBeat(beats, parsed.n).filter(
      (t) => t > clip.startMs + 150 && t < clip.startMs + clip.durationMs - 150,
    );
    let next = c;
    let count = 0;
    /** Split from the end so earlier times stay valid on the left piece. */
    for (const t of [...cuts].reverse()) {
      const still = next.clips.find(
        (cl) =>
          cl.trackId === clip.trackId &&
          t > cl.startMs + 100 &&
          t < cl.startMs + cl.durationMs - 100,
      );
      if (!still) continue;
      const split = splitClipAt(next, still.id, t);
      if ("error" in split) continue;
      next = split;
      count += 1;
    }
    return {
      ok: true,
      composition: next,
      summary: count
        ? `Split into pieces on every ${parsed.n} beats (${count} cuts).`
        : `No cut points fell inside the clip for every ${parsed.n} beats.`,
    };
  }

  return { ok: false, error: "Unknown command." };
}

/** Re-export attach for music edit pipelines. */
export { attachSoundtrack } from "@/lib/studio/composition";

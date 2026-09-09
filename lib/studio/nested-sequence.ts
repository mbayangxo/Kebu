/**
 * Nested sequences — embed another video project's composition as a clip source.
 */
import {
  compositionDurationMs,
  newCompositionId,
  parseStudioComposition,
  studioCompositionSchema,
  type StudioComposition,
} from "@/lib/studio/composition";

export function nestProjectAsClip(
  host: StudioComposition,
  opts: {
    nestedProjectId: string;
    nestedTitle: string;
    nestedComposition: unknown;
    atMs?: number;
    trackId?: string;
  },
): StudioComposition | { error: string } {
  let nested: StudioComposition;
  try {
    nested = parseStudioComposition(opts.nestedComposition);
  } catch {
    return { error: "Nested project composition is invalid." };
  }

  const track =
    (opts.trackId ? host.tracks.find((t) => t.id === opts.trackId) : null) ??
    host.tracks.filter((t) => t.kind === "video" && !t.locked).sort((a, b) => a.order - b.order)[0];
  if (!track) return { error: "No unlocked video track for nested sequence." };

  if (opts.nestedProjectId.length < 10) {
    return { error: "Invalid nested project id." };
  }

  const durationMs = Math.min(600_000, Math.max(500, compositionDurationMs(nested)));
  const onTrack = host.clips.filter((cl) => cl.trackId === track.id);
  const end = onTrack.reduce((m, cl) => Math.max(m, cl.startMs + cl.durationMs), 0);
  const startMs = Math.max(0, opts.atMs ?? end);

  const previewUrl =
    nested.clips.find((c) => c.sourceUrl && c.sourceUrl.length > 8)?.sourceUrl ?? "";

  const clip = {
    id: newCompositionId("cl"),
    trackId: track.id,
    name: `Nested · ${opts.nestedTitle}`.slice(0, 120),
    sourceUrl: previewUrl || "",
    startMs,
    durationMs,
    sourceInMs: 0,
    speed: 1,
    volume: 1,
    opacity: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    sceneId: null,
    nestedProjectId: opts.nestedProjectId,
  };

  return studioCompositionSchema.parse({
    ...host,
    clips: [...host.clips, clip],
  });
}

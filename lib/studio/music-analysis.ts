/**
 * Studio S8c-lite — music analysis + beat grid (browser Web Audio).
 * Honest BPM/onset estimate — not a commercial mastering suite.
 */

export type MusicAnalysisResult = {
  durationMs: number;
  bpm: number;
  /** Beat times in ms from start of audio */
  beatsMs: number[];
  /** Confidence 0–1 for BPM estimate */
  confidence: number;
  method: "energy_onset";
  /** Downsampled waveform peaks 0–1 for timeline drawing (V1) */
  peaks: number[];
  /** Energy envelope times (ms) aligned with energyValues (Audio Reactive foundation) */
  energyMs: number[];
  /** Normalized energy 0–1 at energyMs */
  energyValues: number[];
};

export function roundCaurisLike(n: number, decimals = 2): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

/** Downmix + resample helper for analysis (mono float -1…1). */
export function monoFromAudioBuffer(buffer: {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  getChannelData: (ch: number) => Float32Array;
}): { samples: Float32Array; sampleRate: number } {
  const { length, numberOfChannels, sampleRate } = buffer;
  const samples = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) samples[i]! += ch[i]! / numberOfChannels;
  }
  return { samples, sampleRate };
}

/**
 * Onset strength via frame energy flux, then BPM via autocorrelation.
 * Pure — unit-testable without AudioContext.
 */
export function analyzeBeatsFromSamples(
  samples: Float32Array,
  sampleRate: number,
  opts?: { maxDurationSec?: number },
): MusicAnalysisResult {
  const maxSec = opts?.maxDurationSec ?? 180;
  const maxSamples = Math.min(samples.length, Math.floor(sampleRate * maxSec));
  const durationMs = Math.round((maxSamples / sampleRate) * 1000);

  const hop = Math.max(256, Math.floor(sampleRate * 0.01)); // ~10ms
  const frame = hop * 2;
  const energies: number[] = [];
  for (let i = 0; i + frame < maxSamples; i += hop) {
    let e = 0;
    for (let j = 0; j < frame; j++) {
      const v = samples[i + j]!;
      e += v * v;
    }
    energies.push(e / frame);
  }

  const flux: number[] = [0];
  for (let i = 1; i < energies.length; i++) {
    flux.push(Math.max(0, energies[i]! - energies[i - 1]!));
  }

  // Smooth
  const smooth = flux.map((_, i) => {
    const a = flux[i - 1] ?? 0;
    const b = flux[i]!;
    const c = flux[i + 1] ?? 0;
    return (a + b + c) / 3;
  });

  const mean = smooth.reduce((s, v) => s + v, 0) / Math.max(1, smooth.length);
  const threshold = mean * 1.4;

  const onsetIdx: number[] = [];
  for (let i = 1; i < smooth.length - 1; i++) {
    if (smooth[i]! > threshold && smooth[i]! >= smooth[i - 1]! && smooth[i]! >= smooth[i + 1]!) {
      if (!onsetIdx.length || i - onsetIdx[onsetIdx.length - 1]! > 4) onsetIdx.push(i);
    }
  }

  const bpmEst = estimateBpmFromOnsets(onsetIdx, hop, sampleRate);
  const bpm = clampBpm(bpmEst.bpm);
  const beatIntervalMs = 60_000 / bpm;

  // Align grid to first strong onset in first 4s, else 0
  let offsetMs = 0;
  const early = onsetIdx.map((i) => (i * hop * 1000) / sampleRate).filter((t) => t < 4000);
  if (early.length) offsetMs = early[0]!;

  const beatsMs: number[] = [];
  for (let t = offsetMs; t < durationMs; t += beatIntervalMs) {
    beatsMs.push(Math.round(t));
    if (beatsMs.length >= 800) break;
  }

  // Merge nearby detected onsets into grid (prefer real peaks)
  const merged = mergeBeatsWithOnsets(
    beatsMs,
    onsetIdx.map((i) => Math.round((i * hop * 1000) / sampleRate)),
    beatIntervalMs * 0.35,
  );

  const peaks = buildWaveformPeaks(samples.subarray(0, maxSamples), 240);
  const { energyMs, energyValues } = buildEnergyEnvelope(energies, hop, sampleRate, 120);

  return {
    durationMs,
    bpm: Math.round(bpm * 10) / 10,
    beatsMs: merged.slice(0, 800),
    confidence: bpmEst.confidence,
    method: "energy_onset",
    peaks,
    energyMs,
    energyValues,
  };
}

/** Absolute-value downsample for waveform UI (V1). */
export function buildWaveformPeaks(samples: Float32Array, buckets = 240): number[] {
  const n = Math.max(1, Math.min(buckets, 512));
  if (!samples.length) return Array.from({ length: n }, () => 0);
  const out: number[] = [];
  const bucket = Math.max(1, Math.floor(samples.length / n));
  let maxAbs = 1e-6;
  for (let i = 0; i < n; i++) {
    let peak = 0;
    const start = i * bucket;
    const end = Math.min(samples.length, start + bucket);
    for (let j = start; j < end; j++) peak = Math.max(peak, Math.abs(samples[j]!));
    out.push(peak);
    maxAbs = Math.max(maxAbs, peak);
  }
  return out.map((v) => Math.min(1, v / maxAbs));
}

/** Coarse energy curve for Audio Reactive foundation (not animation presets). */
export function buildEnergyEnvelope(
  frameEnergies: number[],
  hop: number,
  sampleRate: number,
  buckets = 120,
): { energyMs: number[]; energyValues: number[] } {
  const n = Math.max(1, Math.min(buckets, 256));
  if (!frameEnergies.length) {
    return { energyMs: [0], energyValues: [0] };
  }
  const bucket = Math.max(1, Math.floor(frameEnergies.length / n));
  const energyMs: number[] = [];
  const raw: number[] = [];
  let maxE = 1e-9;
  for (let i = 0; i < n; i++) {
    const start = i * bucket;
    const end = Math.min(frameEnergies.length, start + bucket);
    let sum = 0;
    for (let j = start; j < end; j++) sum += frameEnergies[j]!;
    const avg = sum / Math.max(1, end - start);
    raw.push(avg);
    maxE = Math.max(maxE, avg);
    const frameIdx = Math.floor((start + end) / 2);
    energyMs.push(Math.round((frameIdx * hop * 1000) / sampleRate));
  }
  return {
    energyMs,
    energyValues: raw.map((v) => Math.min(1, v / maxE)),
  };
}

/** Sample energy at timeline time (Audio Reactive foundation). */
export function energyAtTimeMs(
  energyMs: number[],
  energyValues: number[],
  timeMs: number,
): number {
  if (!energyMs.length || !energyValues.length) return 0;
  if (timeMs <= energyMs[0]!) return energyValues[0]!;
  for (let i = 1; i < energyMs.length; i++) {
    if (timeMs <= energyMs[i]!) {
      const t0 = energyMs[i - 1]!;
      const t1 = energyMs[i]!;
      const v0 = energyValues[i - 1]!;
      const v1 = energyValues[i]!;
      const u = t1 === t0 ? 0 : (timeMs - t0) / (t1 - t0);
      return v0 + (v1 - v0) * u;
    }
  }
  return energyValues[energyValues.length - 1]!;
}

function clampBpm(bpm: number): number {
  let b = bpm;
  while (b < 70) b *= 2;
  while (b > 180) b /= 2;
  return Math.max(70, Math.min(180, b));
}

function estimateBpmFromOnsets(
  onsetIdx: number[],
  hop: number,
  sampleRate: number,
): { bpm: number; confidence: number } {
  if (onsetIdx.length < 4) {
    return { bpm: 120, confidence: 0.2 };
  }
  const intervals: number[] = [];
  for (let i = 1; i < onsetIdx.length; i++) {
    const ms = ((onsetIdx[i]! - onsetIdx[i - 1]!) * hop * 1000) / sampleRate;
    if (ms >= 250 && ms <= 1200) intervals.push(ms);
  }
  if (!intervals.length) return { bpm: 120, confidence: 0.25 };

  // Histogram of IOIs → dominant period
  const bins = new Map<number, number>();
  for (const ms of intervals) {
    const key = Math.round(ms / 10) * 10;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  let bestMs = 500;
  let bestCount = 0;
  for (const [ms, count] of bins) {
    if (count > bestCount) {
      bestCount = count;
      bestMs = ms;
    }
  }
  const bpm = 60_000 / bestMs;
  const confidence = Math.min(1, bestCount / Math.max(4, intervals.length * 0.3));
  return { bpm, confidence };
}

function mergeBeatsWithOnsets(grid: number[], onsets: number[], tolMs: number): number[] {
  const out = [...grid];
  for (const o of onsets) {
    const near = out.findIndex((b) => Math.abs(b - o) <= tolMs);
    if (near >= 0) out[near] = o;
    else if (o >= 0) out.push(o);
  }
  out.sort((a, b) => a - b);
  const dedup: number[] = [];
  for (const t of out) {
    if (!dedup.length || t - dedup[dedup.length - 1]! > tolMs * 0.5) dedup.push(t);
  }
  return dedup;
}

/** Snap a timeline time to nearest beat (optional threshold). */
export function snapTimeToBeat(
  timeMs: number,
  beatsMs: number[],
  thresholdMs = 80,
): { timeMs: number; snapped: boolean; beatMs: number | null } {
  if (!beatsMs.length) return { timeMs, snapped: false, beatMs: null };
  let best = beatsMs[0]!;
  let dist = Math.abs(timeMs - best);
  for (const b of beatsMs) {
    const d = Math.abs(timeMs - b);
    if (d < dist) {
      dist = d;
      best = b;
    }
  }
  if (dist <= thresholdMs) return { timeMs: best, snapped: true, beatMs: best };
  return { timeMs, snapped: false, beatMs: null };
}

/** Decode + analyze in the browser. */
export async function analyzeMusicFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<MusicAnalysisResult | { error: string }> {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return { error: "Music analysis needs a browser." };
  }
  try {
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    await ctx.close().catch(() => undefined);
    const { samples, sampleRate } = monoFromAudioBuffer(buffer);
    return analyzeBeatsFromSamples(samples, sampleRate);
  } catch {
    return { error: "Could not decode audio. Use MP3, WAV, or OGG." };
  }
}

export async function analyzeMusicFromUrl(
  url: string,
): Promise<MusicAnalysisResult | { error: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: "Could not download audio." };
    const buf = await res.arrayBuffer();
    return analyzeMusicFromArrayBuffer(buf);
  } catch {
    return { error: "Could not load audio for analysis." };
  }
}

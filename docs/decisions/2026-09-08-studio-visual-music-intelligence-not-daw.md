# ADR: Kebu Studio = Visual Creation + Music Intelligence (not a DAW)

**Date:** 2026-09-08  
**Status:** Accepted  
**Related:** `docs/product/KEBU-STUDIO-VIDEO-ARCHITECTURE.md` · `lib/studio/music-analysis.ts` · composition `lib/studio/composition.ts`

## Decision

```
Kebu Studio = Visual Creation Studio + Music Intelligence
```

**Not:**

```
Kebu Studio = DAW
```

We build the **music/timeline infrastructure a DAW would need** (tempo, beats, structure, energy, snap, multi-track audio under creative layers) — without shipping recording studio / mixer / MIDI / plugin-host product.

Users talk to Kebu in creative language:

- “Make my photos change every 4 beats.”
- “Make the logo pulse on every kick.”
- “Accelerate during the chorus.”
- “Title on beat 1 · disappear after 8 beats.”

## Timeline model (signature)

```
VIDEO 1    ────🎬────🎬────────🎬────
VIDEO 2         ───────🎬─────────────
TEXT       ─────TITLE───────────────
GRAPHICS       ✦────✦────✦──────────
VOICE      ─────────🎙──────────────
MUSIC      ══════════════════════════
SFX              🔊──────🔊──────
             ↓   ↓   ↓   ↓
BEATS        |   |   |   |   |   |
```

**VIDEO tracks:** clips · photos · graphics · text · shapes · animations · effects  
**AUDIO tracks:** soundtrack · voiceover · SFX · multiple audio lanes  
**MUSIC INTELLIGENCE:** BPM · beat grid · markers · downbeats · bars · waveform · energy · snap · (later) chorus/verse/drop  
**ANIMATION (V2):** keyframes · position/scale/rotation/opacity · effects · audio-reactive

## User-facing name for Web Audio energy

Do **not** market “Web Audio energy.” Product name:

**Audio Reactive**

Modes (when built): Pulse to beat · React to bass · vocals · energy · Waveform · Spectrum · Beat flash · Beat zoom · Beat shake.

## Phased delivery (one vertical slice at a time)

### V1 — Music-aware timeline (build toward now)

| Include | Exclude |
|---------|---------|
| MP3/WAV/OGG | Full DAW mixer / MIDI / plugins |
| Waveform · play/scrub | Mastering suite |
| BPM + beat estimate + markers | Fake “AI DJ” |
| Manual markers · snap-to-beat | |
| Soundtrack + multi creative tracks | |
| Basic trim / fades | |
| Audio energy as **Audio Reactive** foundation | Market as engineering jargon |

**Already in repo (partial):** S8c-lite beat analysis · Video Phase 1 multi-track (`075` `/studio/video`) · composition contract.  
**Gaps for V1 complete:** richer beat UI · manual markers · snap-to-beat on clip edges · fades · honest Audio Reactive presets · song structure labels still V1.5/V2.

### V2 — Real animation

Multi-track keyframes · transform · opacity · easing · transitions · audio-reactive animation. **Not started** as full UI.

### V3 — AI music editing

Natural language → timeline mutations (“cuts follow the beat”, “use chorus as climax”, “30 seconds”, “Senegalese fashion campaign feel”). **Not started.**

## Forbidden

- Claiming CapCut-complete or “Studio is a DAW”
- Shipping fake beat sync / fake structure detection
- Building RECT / Search / Shop multi-inventory as part of this Studio slice
- Parallel-building V2+V3 while V1 music-aware timeline is incomplete

## Engineering

Same composition engine for Quick / Smart / Full Timeline. Music analysis results persist on the project (JSON + optional table). Browser analysis OK for V1; server analysis later if needed — always label confidence.

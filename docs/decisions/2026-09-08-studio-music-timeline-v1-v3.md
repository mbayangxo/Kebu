# ADR: Studio music timeline V1 → V2 → V3

**Date:** 2026-09-08  
**Status:** Accepted

## Decision

Ship music intelligence on **`/studio/video/[id]`** (composition model), one phase after another:

| Phase | Scope |
|-------|--------|
| **V1** | Waveform peaks · play/scrub · BPM/beats · markers · snap · soundtrack · multi creative tracks · trim/fades · energy curve (Audio Reactive foundation) |
| **V2** | Keyframes · transforms · transitions · Audio Reactive presets (pulse / flash / energy) |
| **V3** | AI music edit commands: every N beats, chorus climax, use chorus, detect sections |

Not a DAW. Design canvas page-timeline keeps S8c-lite soundtrack; Full Timeline owns the composition path.

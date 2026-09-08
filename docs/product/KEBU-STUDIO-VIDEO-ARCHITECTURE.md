# Kebu Studio — Video & full creative architecture

**Status:** Canonical architecture · **2026-09-07**  
**Law:** Not “Canva + random CapCut.” One **full creative studio** — simple entry, professional ceiling.  
**Related:** `KEBU-STUDIO-MASTER-SPEC.md` · `KEBU-NO-WATCHING.md` · Create for me / Teach me ADR

---

## 1. Product stance

| Wrong | Right |
|-------|--------|
| African users only need “simple” tools | Same **ceiling** as professionals anywhere; easier, cheaper **entry** |
| Bolt CapCut checklist onto a poster editor | One Studio with **modes** over one media engine |
| Toy timeline that must be rewritten for Pro | Design **tracks · clips · keyframes · storyboard** early |
| **Ship a DAW** | **Visual Creation Studio + Music Intelligence** — tempo/beats/structure/energy under creative tracks, **not** a recording/mixing DAW |

**Canonical law:** `docs/decisions/2026-09-08-studio-visual-music-intelligence-not-daw.md`

```
Kebu Studio = Visual Creation Studio + Music Intelligence
```

Timeline signature: multi-track VIDEO + TEXT + GRAPHICS + VOICE + MUSIC + SFX over a **BEAT grid**. Users speak in beats (“every 4 beats”, “pulse on kick”, “chorus climax”) — Kebu understands the music.


A student makes a TikTok in ~3 minutes. A filmmaker opens the **same project** and goes deep.

---

## 2. Studio product areas (one app)

| Area | Job |
|------|-----|
| **Design** | Graphics, presentations, branding, documents |
| **Image** | Photo edit, AI images, product photography |
| **Video** | CapCut-level creation → eventually professional NLE |
| **Audio** | Voice, music, podcast / audio edit |
| **AI** | Generate, edit, transform, animate, resize |
| **Brand** | Kits + reusable assets |
| **Publish** | Social, web, print, Kebu Shop, Reach |

Do **not** ship as disconnected products. Ecosystem:

```
Studio → Builder → Shop → Reach → Mail → Cloud
```

Example: album cover → music video → press kit → artist site → merch → Cloud storage → Mail.

---

## 3. Video editing modes (same project)

| Mode | Who | Experience |
|------|-----|------------|
| **Quick Edit** | Beginner | Upload clips → best moments · cut dead space · music sync · captions · transitions → export |
| **Smart Edit** | Creator | Guided storyboard + light timeline; Teach me optional |
| **Full Timeline** | Professional | Multi-track video/audio · keyframes · mix · grading path |

Same underlying **composition** model. Modes are **views / assistants**, not separate file formats.

---

## 4. Kebu Storyboard (differentiation)

Before a Premiere-style timeline:

1. User describes intent (“30s fashion · slow open · product at 8s · faster on chorus · logo end”)  
2. Kebu builds **Scene 1…N** (visual cards)  
3. User rearranges scenes  
4. **Storyboard → Timeline → Final video**

Accessible to someone who has never opened Premiere. Maps 1:1 into timeline clips later.

---

## 5. Music intelligence (signature — Africa-first creator need)

**Not a DAW.** Infrastructure a DAW would need, under a **visual** timeline.

Beyond CapCut-style beat ticks:

| Signal | Use |
|--------|-----|
| BPM | Grid, speed |
| Beats / downbeats / bars | Cut on beat · change every N beats · snap |
| Waveform + energy | Scrub + **Audio Reactive** (product name — not “Web Audio”) |
| Sections (verse · chorus · bridge) | Pace edits to structure (V1.5+) |
| Key / intensity curve | Later AI edit + reactive presets |

**Upload a song → Kebu understands structure** (target): BPM · key · beat grid · intro/verse/chorus/bridge/outro · energy curve — then uses that across the creative system.

**Audio Reactive presets (when UI ships):** Pulse to beat · bass · vocals · energy · Waveform · Spectrum · Beat flash · zoom · shake.

### Phases

| Phase | Scope |
|-------|--------|
| **V1** | Music-aware timeline: formats · waveform · play/scrub · BPM/beats · markers · snap · soundtrack · multi creative tracks · trim/fades · energy foundation |
| **V2** | Keyframes · transforms · transitions · audio-reactive animation |
| **V3** | AI music editing (“cuts follow the beat”, “use the chorus”, “photos every two beats”) |

**Live today (partial V1):** soundtrack upload · BPM estimate · beat markers · snap scrub · play sync · Video Phase 1 multi-track (`075`).  
**Not live:** section labels · Audio Reactive preset UI · “cut on every 4th beat” automation · Quick Edit montage · CapCut-complete · DAW mixer.

---

## 6. Essential video (build toward — Phase slices)

Multi-track video · multi-track audio · cut/split/trim · volume/mix · keyframe animation · transitions · animated text · overlays · filters/color · voiceover · auto captions · 9:16 / 1:1 / 16:9 / custom · beat markers · speed · chroma/bg remove · waveforms · undo/version history.

**Honest now:** page timeline + video layers + beat grid + WebM export. Not CapCut-complete.

---

## 7. Professional layer (later — architecture must allow)

Nested sequences · masking · motion tracking · advanced keyframes · curves/easing · color grading · LUTs · audio FX · noise reduction · EQ · compression · multicam · proxies · 4K · pro export controls.

Do **not** claim these until assigned and TESTED.

---

## 8. Engine architecture (avoid rewrite)

```
Storyboard scenes
       ↓ compile
Composition
  · tracks[] (video | audio | caption | overlay)
  · clips[] on tracks (source, in/out, speed, opacity, …)
  · keyframes[] (property, time, value, easing)
  · transitions[] between clips
  · soundtrack + analysis (bpm, beats, sections)
  · markers[]
       ↓ render
Preview / export (WebM → MP4 when pipeline ready)
```

**Rules:**

- Graphics pages and video compositions can **coexist** in one Studio project (campaign pack).  
- Quick Edit / Smart Edit write the **same** composition schema Full Timeline edits.  
- Persist in Supabase (`create_designs.canvas` or dedicated `studio_compositions` when scale demands).  
- Never ship fake multi-track UI that doesn’t mutate this model.

Code contract: `lib/studio/composition.ts` (schema + helpers). Grow slices against it.

---

## 9. Suggested slice order (video track)

| ID | Slice | Outcome |
|----|-------|---------|
| S8b | Page timeline + video seek export | ✅ |
| S8c-lite | Music BPM + beat grid | ✅ |
| **V1** | Composition schema + `studio_video_projects` + multi-track editor Phase 1 | ✅ Create · upload · place · trim · move · split · autosave |
| **V2** | Storyboard scenes → compile to single video track | Entry |
| **V3** | Quick Edit: multi-clip import · trim · beat-aligned cuts | Beginner path |
| **V4** | Dual audio track + volume + waveform UI | Essential audio |
| **V5** | Split/cut · transitions lite · speed | CapCut core |
| **V6** | Keyframes (opacity/position) · animated text | Motion |
| **V7** | Auto captions (honest ASR provider) | Accessibility |
| **V8** | Full Timeline multi-track UI | Pro path |
| Later | Sections analysis · chroma · grading · proxies · … | Pro layer |

Graphics/fonts/brand editing continues **in parallel only when assigned as separate vertical slices** — do not stall Design for Video or vice versa without priority.

---

## 10. Definition of done (video)

A video feature is done only when: edit → save → reopen → preview matches → export file exists → no invented metrics. Modes must open the **same** project data.

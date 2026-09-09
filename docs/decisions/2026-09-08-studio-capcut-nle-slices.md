# ADR: Studio CapCut path — Quick Edit · speed · captions · color · nested

## Decision

Ship CapCut-class **vertical slices** on the shared `StudioComposition` (never a toy timeline):

1. **Quick Edit montage** — `lib/studio/quick-edit.ts` + wizard on `/studio/video/[id]`
2. **Clip speed UI** — presets + slider; `playbackRate` in preview
3. **Captions** — caption track + `POST .../captions` (paste transcript **or** Whisper when `OPENAI_API_KEY`)
4. **Color grade** — brightness / contrast / saturation on clips (CSS filter preview)
5. **Chroma settings** — persisted key color + similarity (settings end-to-end; canvas-key export later)
6. **Nested sequences** — insert another `studio_video_projects` as a clip (`nestedProjectId`)
7. **edit_mode** DB check expanded — migration **080** (`storyboard` + existing modes)

## Not claimed

**Full NLE parity** (Premiere/CapCut complete): multicam, LUTs, proxies, 4K pro export, nested edit-in-place, canvas chroma export, noise reduction, EQ, curves — remain roadmap.

## Apply

`080_studio_video_edit_modes.sql` after **075**.

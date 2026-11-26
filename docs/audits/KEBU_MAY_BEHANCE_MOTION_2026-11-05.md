# May Behance motion — November 5, 2026

Status: **source candidate; visual and hosted acceptance outstanding**.

## Reference actually inspected

- [Behance longread](https://www.behance.net/gallery/189327258/longrid-blondinka-v-zakone).
- Its embedded [Vimeo walkthrough](https://player.vimeo.com/video/904209593?h=74ec164c80) plays in the Behance page without login in this session. Duration observed: 20.778666 seconds.
- At approximately 0.415 seconds the opening figure, skyline and wordmark remain together. At 1.018 seconds the original wordmark is leaving left while replacement copy enters from the right. Around 1.578 seconds a torn-edge pink biography scene rises over the opening; around 1.952 seconds that biography fills the view. Later frames show the split composition, Harvard paper scene, notebook and character/vehicle collages.
- These are walkthrough playback timestamps, **not original scroll distances, CSS durations or easing curves**. Recorded scrolling speed is not known. The live Tilda page is not used as a substitute for the requested Behance animation.

## Changes in this checkpoint

The existing `LegallyBlondeEditCanvas` remains the renderer for saved legacy May collage heroes in editor, preview and visitor output. No composition, image, text, crop, z-order, link or project record is reseeded.

- Measure the actual sticky pin, rather than the full-length first child of the track. Progress now reaches one at the real release point, also when an artboard exceeds the viewport height.
- Use the scene's owner document, nearest CSS scroll container and its inner border edge. Subscribe before that container grows scrollable. Measure resize/image-layout changes and coalesce scroll measurements with requestAnimationFrame; clean up observers, listeners and pending frames.
- For identifiable May heroes, hold the opening composition, move the title before the skyline settles, and ease the foreground at a different phase. Default title travel exits one canvas width left, including ultrawide screens.
- Explicit saved travel, including `{x:0,y:0}`, wins over the default title exit. Authored distances scale down from 1200px design space on narrow May canvases. Existing saved idle-motion choices, reduced-motion disabling and edit-selection pause remain in place. Other collage brands keep their existing linear motion.

The phase boundaries and smoothstep easing are **implementation hypotheses informed by the viewed reference**. They are not recovered source values. This checkpoint does not add the incoming replacement-copy panel, biography wipe, notebook transitions or a whole-site scene timeline. It does not certify saved native-page compositions, which use a separate rendering path. The legacy template fixture is not May's complete hosted project.

## Source and validation

Base: Claude's consolidated audit `f510ff13e7bddc059fb4a3f0346328807acfd141`. GitHub comparison established it contains authoritative `8fb56648a87a4ea0bc617e159aaf7536cc8f9122` (54 ahead, zero behind). Both branch heads were reread before source sharing.

The native checkout was unavailable: Git proxy access lacked credentials. `workspace:check` could not satisfy its native Git fetch/ancestry gate. Source was restored through the GitHub connector, preserving the exact parent/tree and leaving unrelated remote entries unchanged. This limitation is not recorded as a passed workspace gate.

| Check | Observed result |
| --- | --- |
| `npm run ci` on restored dependency graph | Pass: TypeScript, lint with 26 warnings and zero errors, 13 tests, production build |
| Focused regression coverage | Tall-pin release, panel origin, reverse scroll, clamping, layer phase ordering, no overshoot, phone/ultrawide title exit, explicit stationary travel, saved rotation/travel |
| Real `SiteRenderer` dev fixture request | HTTP 200; actual component graph compiles and server renders |
| Full repository CI | **Not established**: only the renderer dependency graph and relevant tests were restored; root layout/CSS used a temporary uncommitted harness |
| Changed-output browser comparison | **Blocked**: cloud browser cannot reach the local server; the subsequently authorized Vercel preview was rejected with HTTP 402 `resource_creation_blocked` (team fair-use limit) |
| Reduced motion / editing in a running browser | **Not reverified**; existing controls preserved by code inspection |
| Hosted May application / owner save-publish | **Not performed** |

The feature branch disables its Vercel Git deployment in `vercel.json`; the commit also uses `[skip vercel]`. No deployment, hosted write, migration, provider activation or source-branch integration is implied.

## Required next acceptance

Use an authorized reachable preview of May's actual saved project, preserving its recovery snapshot. Compare desktop and phone at opening, title departure, skyline settle, pin release and reverse-scroll checkpoints. Check reduced motion, selected-layer editing, image loading/resize, links and refresh. Reject or retune the timing hypotheses against that output. Then implement and compare the remaining scene transitions, including the incoming copy and torn-paper biography reveal, on the applicable saved legacy/native composition path. Do not describe the whole site as matching Behance on the strength of this checkpoint.

## Local continuation after preview rejection

The user authorized a preview, then reported an 18-day usage reset and a $20 upgrade. No upgrade, payment, alternative hosting or further deployment was performed. Local work continues without requiring that spend.

Five additional tests execute the actual scroll hook effect with controlled React lifecycle/DOM adapters. They cover the owner frame, a panel before late-loading media makes it scrollable, panel borders, reverse scroll, resize, requestAnimationFrame coalescing, cleanup and disabled motion. They exposed reliance on the global ResizeObserver despite using the scene owner frame for other APIs; the constructor now comes from that same owner frame. Four cases failed before that repair and all five pass afterward. These are adapter tests, not real-browser visual or reduced-motion acceptance.

Updated local validation: TypeScript, lint (zero errors / 26 warnings) and 18 tests across three files pass. The fresh `npm run ci` build failed in unchanged IBM Plex Sans `next/font/google` generation: Turbopack reports `next/font/google queries have exactly one entry` and cannot resolve its internal generated font module. After removing only generated `.next` output, `npm run build` passed. Record this as a failed combined run followed by a successful clean standalone build, not an uninterrupted CI pass. No font source was changed. The same restored dependency-graph and temporary-layout scope applies; whole-repository and hosted acceptance remain outstanding. No additional reference scene is claimed implemented by this lifecycle repair.

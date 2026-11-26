# 3F / 3G rich media and editorial blueprint

The user explicitly authorizes completing both stages, including local QA. This blueprint follows the Creative Core roadmap. Signed-in S8 and rollout remain separate existing gates.

## Product and surfaces

The existing Create editor, element hierarchy, selected-element inspector, same-origin device previews and immutable published page remain the only surfaces. No second editor/document model. 3F adds bounded masks and visual effects, native accessible video and structured rich text runs. 3G decomposes Hero, editorial, gallery and media-heavy sections into ordinary nested primitives. Compatibility sections remain readable; conversion must be explicit, atomic, undoable and refuse unrepresentable data.

## Journeys and interaction

Select an element → open its compact settings → change a mask/effect or rich content → canonical operation → saving/saved/error → Undo/Redo → reload → same content. Add video inside a section/group → choose an existing owned media asset or safe address → poster and caption settings → preview → publish. Select a supported legacy section → inspect conversion impact → convert → individually edit its ordinary children. No destructive automatic conversion.

## Components and visual specification

Reuse Builder tokens, existing 12px labelled controls, fieldsets, compact details accordions, pending/lock handling, media library and save status. Canvas remains primary. Mask/effect controls belong to style properties; complex rich text receives a dedicated structured editor rather than raw HTML/JSON. Native browser video controls own playback; there is no editor autoplay. Published content remains readable with JavaScript disabled.

## Data, state, permission and backend

All data stays in KCD nodes/props with strict schemas and descriptor-governed independent tablet/phone overrides. Native rich runs are escaped React content; links use the existing allow list. Masks use bounded built-in shapes; effects use bounded numeric values, never arbitrary CSS or scripts. Video uses HTTPS/same-origin assets, native controls, no autoplay and low-bandwidth preload=none. Captions require a labelled language. Existing operations, journal, inverse history, locks, project ownership, RPC authority and immutable publication are mandatory. Forward migrations extend native type/override rules and publication renderer requirements without broadening privileges. No production migration/deployment is authorized by this local continuation.

## Responsive, keyboard and states

Device inheritance/reset follows 3D. Controls use native label/input/select/button semantics and keyboard interactions. Invalid input retains its draft with a visible error; failed saves preserve pending work. Empty media offers a real choice/upload path; missing media remains honestly labelled. Disabled locks/pending state reuse existing controls. Masking must preserve semantic content and authored transforms. Effects must not make underlying content inaccessible by default.

## Ordered vertical slices and completion

1. Masks and bounded visual effects through registry → inspector → save/history → renderer/publish → actual SQL and browser QA.
2. Structured rich text runs with accessible editing, safe links, history/device rendering and failure tests.
3. Native video including real media selection, poster/captions, load/error/reduced-motion and low-bandwidth tests.
4. Explicit legacy decomposition with complete field/device preservation or refusal, atomic history and responsive composition and content-preservation checks for each supported family. Conversion explicitly changes the layout into editable composition; it does not promise pixel-identical legacy output.

Each slice must pass typecheck/lint, meaningful core/API/SQL tests, running-browser desktop/tablet/phone QA and shared performance budgets. Final stages require complete Node 20 CI and the expanded full browser matrix. Neither phase is complete while any item above is missing. 3H–3J remain later work.

## Completed local gate — 2026-10-08 UTC

3F is implemented: bounded ellipse/diamond/arch masks, opacity/blur/brightness/saturation/shadow, semantic text runs with safe selected links, and nested native video with owned-media selection, posters, caption language, native controls, preload=none and visible playback errors. Device edits/reset, save acknowledgements, locks and inverse history use the existing authority path. Empty device runs can be cleared and retyped.

3G supports explicit conversion of hero, editorial-hero, split, text, image, gallery and video. Native groups provide grid, carousel and masonry composition, padding, backdrop fill, grid span and section viewport-height/content placement. Conversion preserves root identity, copy/media/links and supported independent device values. Unsupported fields, connected data, legacy effects, locks, ambiguous media and unsafe input refuse conversion without a write. Other compatibility families remain intact. Legacy gradients become bounded solid overlays; conversion review explains layout changes and offers cancellation and Undo. This is ordinary editable composition, not a hidden family-specific renderer.

The full matrix passed **147 browser cases**, followed by **9 final rich-text cases** after the clear/retype edge-case fix. **9/9 unchanged performance budgets** passed. Real migration-chain PostgreSQL/WASM tests exercised owner/journal/replay, nested video placement, publication and conversion/inverse history: **59 focused tests**, also included in final CI. Node **20.20.2** CI passed typecheck, lint (**0 errors / 289 existing warnings**), **5,376 tests / 110 environment skips**, and a clean **201-page production build**. See `evidence/3f/README.md` and `evidence/3g/README.md`.

Initial failures and fixes are retained: media source/poster picker separation, real keyboard text selection, legacy-only phone selection, horizontal carousel direction, nested video placement, and distinguishing restored root IDs from newly inserted children. Conversion uses remove-root → restore-same-root → insert-new-children in one transaction; restoration authority was not weakened. Older unknown-video test fixtures now use an unknown future type.

The 3F/3G local development gates are complete. Next is 3H Brand Brain with its own architect/design freeze. Signed-in S8, actual upload/publish/reload, cross-user ownership, internal-environment migrations and release/default decisions remain separate. No production migration, deployment, push or merge occurred.

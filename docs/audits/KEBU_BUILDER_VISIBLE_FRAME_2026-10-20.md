# Builder visible crop frames and atomic gestures — October 20

Implementation checkpoint: `6ea9d0881300941682d32332f4914085912b04b9`, source tree `43ab611bcb4fcf94ea9b4ab0ed9286ce6178134c`. This preserves the reconciled Claude Studio formats/fonts/payout rail and Codex locale/May-contact/Liguey-retry work through `3605227`. It does not certify the entire Builder, Studio, May site, 3J or 99-group requirements.

## Reproduction and repair

The ordinary Builder's actual crop/SQL journey reproduced a **17.03px** difference between the expected cropped width and the selectable frame. Rendering clipped pixels inside a full-source hit box. Corner resizing also invented a height of 0.7 × width, mixed horizontal/vertical percentage units, saved size and position separately, and persisted canceled gestures.

The source carrier now retains the original image, intrinsic dimensions, authored position/stacking/rotation/opacity and full-source motion pivot. A separate symmetric cropped frame receives selection, link and hit testing. A hidden same-URL intrinsic image preserves source layout without JavaScript; it is not alternate artwork. Source stretch keeps its existing meaning. No artist pixels, face, asset URLs, immutable payload defaults or production schema are changed.

Corner resizing uses the shared rotation geometry, actual source dimensions, the historical minimum source width, existing scale limits and canonical position bounds. Opposite cropped anchors or Alt-center stay fixed. Transient movement updates DOM styles; pointer-up issues one canonical patch containing scale and position. Extra-cutout coordinates travel in the same patch. Pointer cancellation restores the prior presentation without a write. Keyboard handles use the same geometry.

Selection controls live in a named scene overlay above public navigation, without raising artwork above navigation. Context menus use viewport-coordinate portals. Drag/focus selection no longer opens an inspector mid-gesture; explicit click/Enter still does. Same-origin iframe commands preserve and validate that optional UI intent, retain the existing owned-page guard, and use existing canonical callbacks. The embedded renderer also receives its project ID for real asset uploads. A trailing native gesture click cannot select the underlying section.

## Executed verification

- Full local `npm run ci` exited **0**: **6,327 passed / 290 explicitly skipped**, zero lint errors (347 existing repository warnings), finalized production build. Focused geometry, message-boundary and SSR rendering: **57 passed**. Migration hygiene: **90 unique canonical versions**; this slice adds no migration.
- The complete final-code native Builder release suite passed **58/58, zero skips/failures/flaky cases**. This includes 3J editor/published flows, the five-page fixture with JavaScript on/off at three widths, canonical storage/history/conflict/truncated-response/page-operation regressions, neutral section creation, video persistence and actual decoded media/scroll/manual/reduced-motion/error paths.
- Real `/create/{id}` → operations → migrated isolated PostgreSQL → undo/redo → reload → publish ran for **Desktop, Tablet and Phone**. Tests measure the actual cropped hit frame, one combined scale/position transaction, one undo restoring both, fixed opposite corner, Alt-key center, 30° rotated corner/handle registration, rotation-preserving undo, no inspector reflow, no legacy writes and zero page errors. Phone additionally uses native Chromium touch start/move/end and touch cancellation; cancellation is checked after flushing Save draft and must produce no operation.
- All **nine unchanged performance probes** passed: 100/500/2,000 nodes on desktop/tablet/phone. They measure actual Builder input to visible paint with controlled operation authority, predominantly legacy text nodes; they do not certify hosted network latency or 2,000 simultaneous animated images. Exact samples are retained with the receipt.
- Desktop/tablet/phone screenshots were retained; the rotated phone image was visually inspected. The selected frame and controls match the cropped image above the site navigation. This is not May art-direction acceptance: the screenshot still exposes inherited social-icon and asset/layout defects.

Evidence: `docs/audits/evidence/builder-visible-frame-oct20/`. The exact source was pushed before remote CI, Builder, platform and hosted E2E gates. Those gates were pending when this audit was written; read their actual conclusions before authoritative integration. Source-only checkpoint existence is not completion evidence.

## Remaining work and release limits

The current four corners resize uniformly. **Eight independent width/height handles, Shift aspect lock, precise visible-frame dimensions and freeform frame fitting remain OPEN**. The old Height control remains source stretch, not a new independent frame height. Do not rename that capability as completed.

Responsive image width/height/crop override detection in the parent inspector still omits those keys, even though the inspector's reset-key list contains them; target-specific reset behavior needs separate review before broadening frame data. Duplicate/reset/hidden/locked metadata and unrelated layer preservation must be included in the next acceptance slice.

Published May social rails can still display unconfigured/broken legacy icons. Existing opaque/checkerboard artwork, phone navigation composition, actual artist video inventory and all 14-page exact-reference choreography remain open. The five-page 3J fixture is not a fourteen-page certification. Do not alter May's face or replace her original images with generated portraits.

Hosted Auth/REST/Storage/RLS/provider acceptance remains open. Read-only production inspection recorded in the platform continuity audit found the canonical Builder RPCs and newer platform tables absent. No production migration, payout, external email, DNS change or production promotion occurred here. A ready preview is not a working production-release certification.

# Studio selection reconciliation — October 22, 2026

Runtime **8f4225e0a9059d40dca9e0129c4d9b492fa89687** was fast-forwarded from053510ad onto the authoritative recovery branch and reread. All six changed source blob hashes match the locally reviewed files. This is a verified editor slice, not full Studio or platform release certification.

## Behavior and root causes

The recovery editor lacked marquee selection present in older Studio2048 work. Its geometry helper was adapted into the current editor instead of replacing newer text, resize, history or save behavior. Selection uses measured artboard coordinates, current painted motion frames and rotated-rectangle intersection. Locked/invisible layers stay excluded; group expansion respects those exclusions. Shift/Command/Control adds to selection. Selection alone produces no document write or undo entry. Read-only viewers gain no edit authority.

Native pointer identity now scopes transforms and panning. Escape or native cancellation leaves the previous marquee selection intact; canceled transforms restore their baseline through existing cancelGesture authority. Touch canvas gestures avoid native scroll cancellation. Deselection belongs to an unmoved gesture that actually starts on background. This fixes a real regression where the browser retargeted the post-resize touch click to the board, clearing selection and removing Inspector object controls.

## Verification

| Gate | Result | Exact run / job |
| --- | --- | --- |
| Original selection baseline | Original component loaded; two-layer selection assertion failed as expected; startup/launch errors rejected | [39724550965](https://github.com/mbayangxo/Kebu/actions/runs/39724550965) /119645375300 |
| Actual Studio browser suite | 44 passes; zero skips, unexpected or flaky; normal server/Auth/config cleanup | Same run/job |
| Full CI | TypeScript; zero lint errors/347 existing warnings; 6,536 tests pass/338 explicit skips,407 files pass/48 skip; finalized230-page build | [39724550969](https://github.com/mbayangxo/Kebu/actions/runs/39724550969) /119645375281 |
| Hosted public | 533 pass/35 explicit skips; not authenticated acceptance | [39724697662](https://github.com/mbayangxo/Kebu/actions/runs/39724697662) /119645832963 |
| Local focused | 20 geometry/craft/movement tests pass; TypeScript passes with6GB heap; changed-file lint has zero errors/five pre-existing warnings | Local checkout, source hashes matched |

The44 cases include ten new selection/cancellation cases plus saved/reopened transforms, IndexedDB recovery, error/conflict paths, history, direct text/IME, viewer permissions, real decoded PNG/PDF/ZIP/WebM output and custom-font loading. The exact final remote fullCI is authoritative; an earlier full localCI also passed but preceded the final touch-selection refinement. Fixture media is intentionally synthetic test content. No stock-library or template-design acceptance is inferred.

Actual browser testing exposed and repaired two issues during development: an initial phone test began too near a text layer rather than clear canvas (corrected and asserted the native target), and a subsequent existing phone resize case caught the real retargeted-click selection loss described above. Run39723640065 failed before loading the editor because the dev Turbopack Google-font query resolver returned500. The isolated harness now uses Next's documented supported --webpack dev option; application fonts and production compiler are unchanged. Final production build passed independently. The baseline guard rejected that startup failure rather than counting it as a reproduced product defect.

The local Chromium installation was absent and its download returned a truncated archive. Actual browser evidence therefore comes from GitHub Actions, where Chromium installation and the full suite passed. No local browser pass is claimed for this slice. Local TypeScript initially exhausted the default2GB heap and passed with the same6GB heap used in CI.

## Visual and deployment evidence

Artifact12402687069 from the final run contains before/after reports, screenshots and server logs. Desktop selection and phone390/tablet834 screenshots were inspected, including actual transform handles and preserved selection. Selected screenshots are retained alongside [verification.json](evidence/studio-selection-oct22/verification.json).

Exact READY preview: https://kebu-3f6qrxx6n-mbayangxos-projects.vercel.app (dpl_3k7f35MYFLRbz4AzjdVUecq9DHDv). Isolated Studio tests use real application components but synthetic local Auth and API transport fixtures, not GoTrue, managed hosted SQL/RLS or live collaboration. Hosted public smoke does not close signed-in hosted26 acceptance.

Production remains unpromoted. No database migration, DNS, provider payment, outgoing email or paid infrastructure change was performed. Full immersive Studio25 groups, rich text, media/collaboration acceptance, Builder/May/reference parity,3J and99 groups remain open. Existing QA access denial and production schema prerequisites remain blockers. Claude Mail/font work and completed3C–3I remain preserved.

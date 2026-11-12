# Studio manipulation and history continuation — October 20

Base: authoritative `c2e19206cbbc39222d44931781bf5afa43bb79fa`. The prior external worktree Git directory had disappeared. Recovered a standalone shallow checkout at that exact commit; all 2,458 tracked blobs and the root tree were verified against GitHub. Existing source, the original commit bundle and older working copies remain preserved. No reset, author rewrite or force push. No newer published Claude branch was found; unpublished work is not assumed absent. Mail is untouched.

## Product repairs

- Eight corner/side resize buttons share document-pixel geometry. Rotation uses object-local axes, Shift preserves ratio, Alt/Option fixes the center. Keyboard arrows resize through the same model. Hit targets retain at least 24 screen pixels under zoom. Schema bounds and floating-point clamping prevent invalid saved dimensions.
- Shift resizing no longer deselects the object. Dragging an existing multi-selection preserves it and translates every unlocked selected/grouped layer together. Pointer capture follows the actual manipulation target. Selection clicks no longer record a canvas mutation.
- Browser reproduction found native `dragstart` followed by `pointercancel`, interrupting movement after one frame. Editor manipulation prevents the native drag; direct text caret/selection retains native behavior. Captured gestures finish on pointer-up/cancel rather than an incidental pointer-leave.
- Design and video history captured mutable refs inside deferred state updaters. Reproduction made Undo replace a canvas with an undefined document. Immutable snapshots are now captured before ref changes; undo/redo no longer performs side effects inside state updaters. The initial/undo skip flag incorrectly dropped the next real edit and was removed.
- Tablet panels become drawers below 1,024px. Phone Save and sync status remain on-screen. Export menus sit above inspector panels; actual ZIP clicks previously exposed interception. Inert header search/favorite controls and the overlapping editor assistant were removed; functional Studio navigation and the existing AI tool remain. Mobile panel buttons have their own row and no longer cover page actions.
- Static designs open without a video timeline. Video, framed video, animation, soundtrack and page transitions expose time tools; More can explicitly show/hide the timeline. Existing documents and persisted formats are preserved.

## Verification

Actual-editor full browser gate: **28 passed, zero skipped/failing/flaky**, including touch at 390/834px, independent mouse/keyboard paths, ratio/center geometry, one-step undo/redo, branching history, saved/reopened dimensions, decoded transformed PNG pixels, PDF/ZIP/video/audio exports, offline/conflict paths, sharing failures and viewer restrictions. Receipt: `evidence/studio-transforms-oct20/browser.json`. Phone screenshots were visually inspected; Save, canvas, panel controls and page actions are visible and unobstructed. Controlled APIs are not a hosted database success claim.

Pure resize tests cover all eight anchors, rotation, center resize, ratio/bounds, document metadata and invalid pointer input. Content-driven timeline tests cover static designs and every supported time-bearing content kind. Final `npm run ci` exited 0: TypeScript passed; lint zero errors/344 warnings; **6,058 tests passed/168 explicit skips**, 367 files passed/22 skipped; production build generated all 221 pages and finalized its build ID/prerender manifest. CI receipt is beside the browser receipt. Four focused browser cases passed again after pending-state feedback and safe-area refinements; zero skips/failures.

Initial full unit execution exposed three source-string assertions tied to the old tablet breakpoint. A later gate caught removal of bottom safe-area protection; the actual page-action bar now retains safe-area padding. Expectations now match the intentionally wider drawer breakpoint; actual tablet browser acceptance supplies behavioral evidence. The first geometry integration test also caught an overly broad finite-value check that incorrectly examined layer string metadata. It now checks geometry fields explicitly and has a real-layer regression case.

## Hosted test boundary

Prior hosted E2E `39386812659`: 528 passed, one failed, 27 skipped, 12 unrun. The sole failure navigated a nonexistent development-only May fixture and audited the redirected login page as May. That group now requires explicit `KEBU_E2E_MAY_FIXTURE=1`; when provisioned, HTTP 200 and the exact fixture marker are mandatory. Missing markers are no longer swallowed. This does **not** certify or replace the required ordinary-account May website journey, and private artist fixtures are not exposed publicly.

## Open gates

This slice advances COS01/04/07/18/21/23/25 but does not close them wholesale. Group resizing/nested hierarchy, marquee, complete rich inline text, resize snapping, all object/export parity, two hosted sessions, large-document measurements and full ordinary-user certification remain open. Builder/May reference recreation, hosted native-operation schema prerequisites, providers, the remaining ecosystem products, full 3J and the 99-group audit remain incomplete. No production migration, DNS change or production promotion was performed. Deployment authorization remains in force after actual acceptance; this checkpoint is not the end of the completion task.

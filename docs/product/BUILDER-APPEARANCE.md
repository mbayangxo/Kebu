# Builder appearance

Requirement K033 remains IN PROGRESS. QA now covers the editor top bar/tool rail, scoped native inspector controls and an explicit Add section mobile-sheet opt-in. Drawer/FullscreenPanel opt-in support, media-helper contrast and child error colors are verified in isolated fixtures. Legacy inspector, Yande, workspace and app-wide appearance still need migration; real authenticated project/provider acceptance and production rollout remain open. Do not call application night mode complete.

## Inspector and portal extension — current work

Native element/text/motion/brand controls opt into `--builder-panel-*` variables through a scope around the native inspector. No variables are added to the editor root, body or customer canvas. Legacy UI tokens remain fixed. The Add section mobile sheet explicitly opts in; Drawer and FullscreenPanel support the same explicit opt-in, defaulting to Light for existing callers. Yande and other legacy inspector/workspace surfaces remain open until their content is migrated and checked. Native field form boundaries use separate contrast-safe border colors. Portal dialog heading IDs use React useId; close controls are 44px.

The preview-only QA fixture uses the actual native inspector and operation engine with a synthetic in-memory document. It exercises text commit, motion inputs, section selection callbacks, all three portal containers, focus trapping/restoration, Escape/Close, scroll locking, theme updates while a dialog is open and customer color parity. Reload resets this synthetic document; it is not authenticated persistence evidence. Existing fixture production gates remain in force.

The toolbar offers Auto / Light / Dark. Auto uses the device's local time: dark at 20:00 through 06:59, light at 07:00 through 19:59. These hours are an implementation assumption because the recovered request did not specify hours. The control explains this schedule.

The versioned device-local preference survives reload, synchronizes across same-origin tabs, and overrides the clock until Auto is selected again. Foreground and minute clock checks handle sleeping tabs and timezone/clock changes. Denied storage still permits a session choice, with an explicit persistence warning. No database or provider credentials are needed; this is not account-wide synchronization.

Chrome uses an explicit palette scoped to those components, including separate action/foreground tokens and native color-scheme. Customer previews, published pages, site aesthetics and document definitions receive no new theme attributes or color variables. The server renders a stable light toolbar; local time/preference is resolved after hydration.

Keyboard: native labelled select; visible focus ring; minimum 44px theme control. The toolbar wraps on narrow screens rather than clipping save/publish controls. Complete acceptance requires reload/cross-tab/time/storage-failure tests plus authenticated desktop/mobile visual and interaction inspection, including customer-site color parity. Keep production rollout separate from QA.

## Verified checkpoint — October 13 UTC

Full CI passes: 5,588 tests / 268 explicit skips, TypeScript, zero lint errors / 288 existing warnings, build. The deployed actual-component fixture passes desktop and phone theme/action/rail tests, reload, two-tab/iframe sync, keyboard selection and website fixture color isolation. The 390px outer frame has a 382px content viewport with identical document scroll width and a 44px selector. The fixture’s global floating chrome was isolated after it intercepted phone taps; the corrected frame was reinspected. A running production configuration returned HTTP 404 for the fixture. Evidence: `evidence/builder-appearance/verification.json`. Genuine signed-in Builder/save/publish and remaining appearance surfaces are not covered by this fixture.

The image/video upload helpers and media-library controls must pair their own themed surface with an explicit foreground. The prior cream helpers inherited pale text from the dark native inspector; this was reproduced in QA and repaired. Media contents, upload callbacks, permissions and APIs are unchanged; provider/storage journeys still need authenticated checks.

## Native/portal verified checkpoint

Full final CI passes: 5,593 tests / 268 explicit skips, TypeScript, zero lint errors / 279 warnings, build. Actual-component native text/motion edits, all portal containers, phone section callback, focus trap/restoration, Escape/Close, scroll cleanup, live theme changes and customer color parity passed. The upload-label regression improved from 1.04:1 contrast to 13.21:1 Dark / 18.33:1 Light. Native top controls now wrap with an explicit 8px gap; portal close targets are 44px. Real signed-out feedback was inspected in both themes. Evidence: `evidence/builder-appearance/panels-verification.json`. Authenticated profile/project saves, uploads and provider flows remain unverified.

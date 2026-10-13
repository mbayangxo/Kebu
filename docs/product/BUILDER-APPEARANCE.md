# Builder appearance

Requirement K033 remains IN PROGRESS. This first isolated slice covers the editor top bar and tool rail; inspector panels, portal panels, workspace and app-wide appearance still need migration and running-app QA. Do not call this application night mode complete.

The toolbar offers Auto / Light / Dark. Auto uses the device's local time: dark at 20:00 through 06:59, light at 07:00 through 19:59. These hours are an implementation assumption because the recovered request did not specify hours. The control explains this schedule.

The versioned device-local preference survives reload, synchronizes across same-origin tabs, and overrides the clock until Auto is selected again. Foreground and minute clock checks handle sleeping tabs and timezone/clock changes. Denied storage still permits a session choice, with an explicit persistence warning. No database or provider credentials are needed; this is not account-wide synchronization.

Chrome uses an explicit palette scoped to those components, including separate action/foreground tokens and native color-scheme. Customer previews, published pages, site aesthetics and document definitions receive no new theme attributes or color variables. The server renders a stable light toolbar; local time/preference is resolved after hydration.

Keyboard: native labelled select; visible focus ring; minimum 44px theme control. The toolbar wraps on narrow screens rather than clipping save/publish controls. Complete acceptance requires reload/cross-tab/time/storage-failure tests plus authenticated desktop/mobile visual and interaction inspection, including customer-site color parity. Keep production rollout separate from QA.

## Verified checkpoint — October 13 UTC

Full CI passes: 5,588 tests / 268 explicit skips, TypeScript, zero lint errors / 288 existing warnings, build. The deployed actual-component fixture passes desktop and phone theme/action/rail tests, reload, two-tab/iframe sync, keyboard selection and website fixture color isolation. The 390px outer frame has a 382px content viewport with identical document scroll width and a 44px selector. The fixture’s global floating chrome was isolated after it intercepted phone taps; the corrected frame was reinspected. A running production configuration returned HTTP 404 for the fixture. Evidence: `evidence/builder-appearance/verification.json`. Genuine signed-in Builder/save/publish and remaining appearance surfaces are not covered by this fixture.

# 3H Builder profile application — design freeze

2026-10-08. Continue the saved four-profile slice with a complete, explicitly scoped application journey. Reuse the native inspector, authenticated Brand Brain GET and KCD operation coordinator; no second save/history system or new database schema.

The inspector offers an initially closed Brand Brain accordion. Opening loads saved owner profiles; loading, empty, incompatible and failed requests remain explicit. A labelled selector and palette preview show the selected saved revision. Selection persists in the editor URL for reload, not as a claimed durable site/profile association. The association across devices remains a later 3H slice.

Apply targets only the selected native element and its descendants. Palette maps section/group backgrounds to the saved background and heading/subheading text to primary, eyebrow to accent, other text to text color. Colors are shared across devices; existing text formatting remains intact. Device layouts, images, copy, geometry, fonts, SEO, theme tokens and legacy sections are unchanged. Legacy/future types and locked ancestry or descendants reject the whole application rather than silently skipping content.

Motion is separately opt-in. Applying disabled Motion DNA clears entrance/interaction effects; enabled DNA uses native presets within duration/distance limits. Lift's native 4px offset cannot exceed the profile's distance cap; incompatible values produce an actionable error. Existing per-device enablement remains. Reduced motion is already enforced by the native renderer. No nested opaque notes execute as instructions.

One bounded transaction contains all changed values, produces one Undo entry, and uses the existing optimistic version checks, immutable retry identity, owner API/RLS, canonical acknowledgement and offline protection. Before submitting, re-read the chosen profile and compare its revision: stale or unavailable direction cannot apply unnoticed. Confirmed draft save state remains owned by Builder; this panel never calls queued changes “Saved”. Repeated no-op applications do not create history. Mobile/keyboard follow the inspector's native details/select/checkbox/buttons and shell tokens.

Verification: planner atomicity, limits, locks, revisions, no-op, bounded motion, unchanged rich/device content, inversion and storage round-trip; browser owner API fixtures plus real coordinator journeys for apply/undo/redo/reload and failed/stale profile recovery, phone/desktop visual QA; full CI. Hosted signed-in S8 remains deferred. Durable site/profile binding, asset curation and full combined 3H closure are not claimed by this slice.

## Local result

The application slice passed 12 focused planner/actual PostgreSQL tests, 71 inspector/authoring regressions (nine optional performance cases skipped), five final application browser journeys and Node 20.20.2 CI (5,415 tests / 110 environment skips; zero lint errors / 289 existing warnings; 202-page build). Final desktop/phone screenshots were inspected. See `evidence/3h/application/README.md`. Permanent association, approved asset curation, hosted signed-in S8 and the combined 3H gate remain open.

2026-10-09 update: permanent owner-scoped attachment and approved imagery now supersede the URL-only selection limitation above. See `3H-completion-design-freeze.md` and `evidence/3h/complete/README.md` for the final implementation, combined functional checks and unresolved absolute timing sign-off. These earlier slice results remain historical evidence; hosted signed-in S8 remains deferred.

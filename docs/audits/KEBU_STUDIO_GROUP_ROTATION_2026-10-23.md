# Studio shared group/selection rotation — October23,2026

Base b9acdc0217c8f90be61cb4ba9ab9eb316d487ff8. This implements a bounded part of COS01/07/18/21/25; it does not certify all group transforms or full Kebu.

The original actual editor has no rotation handle for a group/multi-selection; the baseline browser regression fails on the absent Rotate selection control. Added a shared outline, visible pivot and accessible rotation handle, plus a contextual exact relative-angle form. Pointer/touch drag, Shift15-degree increments and keyboard1-degree/Shift15-degree changes share one pure geometry implementation. A gesture is one undo step; Escape and touch cancellation restore the original document without writes/history. Locked/unrelated objects remain unchanged; hidden members rotate with the composition. Out-of-range transformations reject atomically with a named dismissible error.

The existing flat group format is preserved. A visible-center centroid provides a rotation-invariant pivot without new metadata; successive opposite rotations reverse without drift. See decisions/STUDIO_SELECTION_ROTATION_2026-10-23.md for the decision. Crop/source/style/dimensions/IDs/ownership are retained. Nested groups, resize/skew and animated-preview transform frames remain open.

Verification so far:14 new geometry cases pass;32 combined rotation/snapping/arrange cases pass. TypeScript passes. New helper/spec lint is clean; existing editor retains5 warnings and0 errors. Original absent-handle browser failure reproduced. Final focused6/6 actual browser cases pass, zero skips/unexpected/flaky and normal teardown: exact field plus undo/redo/save/reopen and decoded PNG pixels; mouse gesture cancellation/single-step history; real phone390/tablet834 touch cancellation/completion and exact/keyboard alternatives; atomic invalid-range rejection; viewer restrictions. Desktop/phone/tablet screenshots inspected. Full61 editor suite and full CI/remote preview evidence pending.

Auth/API are isolated loopback fixtures; no managed hosted Auth/RLS claim. No migrations, production promotion, provider call or paid setup. Claude Search/Mail/Foundry work remains separate.

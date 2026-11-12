# 3D constraints and transforms

## Blueprint — 2026-10-08 UTC

The existing native inspector, canvas, device previews and published renderer remain the surfaces. Native nested groups, text and images gain horizontal/vertical constraints and numeric rotation/scale. No new navigation, parallel document model or direct persistence writes.

Constraints store `{ mode, reference }` in `constraintX` / `constraintY`. Modes are start (left/top), centre, end (right/bottom), stretch (both edges), proportional. Reference is the measured container size when setting the constraint. Selecting a constraint captures the current untransformed geometry and reference atomically, preserving appearance. Stretch keeps both edge margins and clamps size to 16–10000px; proportional scales position and size against the reference. Fixed start is the default. Changing one axis preserves the other axis's current appearance. Gestures/alignment rebase active references to the current canvas so no jump occurs after a commit. Constraints apply only in free positioning; flow keeps normal content layout. Resetting a setting uses existing base/device reset actions.

Rotation is bounded to -360..360 degrees; scaleX/scaleY to 0.1..10. The visual body transforms around its centre inside an untransformed geometry wrapper. Canvas controls edit the layout box, not a rotated bounding rectangle. Groups transform their full subtree. Pointer coordinates are mapped through measured container basis vectors, so editing inside a scaled/rotated ancestor still uses local layout units. Transient measurement probes never enter the document or history.

Inspector controls use existing compact labelled fields, inherited/custom device indications, disabled lock/pending states, validation errors and reset actions. Constraints capture the selected device canvas (including iframe previews). Empty or unavailable measurement fails visibly with no writes. Numeric fields commit on Enter/blur; all changes remain one transaction, undoable and persistent after reload. No additional shortcut; existing arrow/Shift/Escape gesture actions remain.

Backend: extend only native override allowlists. Existing ownership, RLS, operation validation, idempotency, compare-and-publish locking and service-only publishing grants remain. New snapshots require renderer 4; older requirements 2/3 stay accepted. A forward migration is exercised only in a disposable database; no live migration or deployment.

Verification: pure constraint math, bounds/schema rejection, storage/history/device independence, renderer/version rejection, actual SQL operation and publishing tests; browser inspector/save/reload/history, constraints under container resize, nested transformed pointer editing, failed save, and public responsive CSS with JavaScript on/off. Full existing browser/performance matrix and `npm run ci`, visual review and cleanup of temporary test routes before production build.

## Internal-use continuation

The target is a complete planned builder for internal use and sustained testing. 3C S1–S7 implementation exists; remaining S8 signed-in/human/default/release checks stay explicitly open. After 3D, continue 3E motion, 3F/3G rich media/editorial primitives, then the separately specified 3H/3I intelligence and 3J real-content gate. The user's instruction to finish all planned stages authorizes continued implementation; each stage still needs its design blueprint and verification. Public rollout is separate from internal readiness.

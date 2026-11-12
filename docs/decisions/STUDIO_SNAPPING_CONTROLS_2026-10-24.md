# Configurable Studio snapping

COS06 requires configurable snapping for transformed selections; COS21 requires native keyboard controls and phone access. The existing visible-bound rigid translation remains the geometry authority.

The toolbar opens a native auto popover with snapping enabled/disabled and a screen-pixel tolerance of2,4,8,12,16 or24 (default8). Alt/Option bypasses magnetism for pointer movement. Values are divided by the displayed zoom before geometry calculation. Changing settings clears guide overlays and never dirties artwork, writes an API request or creates history. Preferences live only while this editor instance is open; reopening starts from the documented defaults. They are workspace settings available to viewers, not a mutation permission.

The popover uses the browser top layer to escape the scrolling toolbar. It wraps text, stays within the phone viewport, supports outside click/Escape and has an explicit Close button. Space-to-pan must yield to native buttons, links and summaries. A regression independently reproduces the intercepted native Space activation before the fix.

Acceptance covers two zoom levels, inside/outside tolerance, Alt bypass, disabled snapping, cancellation, one-step undo, save/reopen, settings without writes, native keyboard activation/focus return and phone/viewer access. Local transport fixtures do not certify managed hosted authentication. No schema, stored artwork format, source media or Claude-owned runtime is changed.

## Touch panel recovery exposed by full verification

The full gate exposed a pre-existing834px failure after a canceled/committed shared rotation: pointer/touch down/up reached Inspector but the browser emitted no compatibility click. It also reproduced on3aa94bcb, independently of the snapping UI. Waiting for the completed React gesture, changing CDP detach timing and a touch-action-only experiment did not repair it. No unsupported browser-internal cause is asserted.

Workspace panel buttons now recognize a completed primary touch tap directly. More than8screen pixels of movement, cancellation, a context menu, a secondary pointer or an out-of-bounds release cannot activate a panel. The next compatibility click is deduplicated; a new pointer-down resets that suppression and zero-detail keyboard/assistive clicks remain native. Both Create and Inspector use functional state updates. Actual browser cases check canceled gestures, in-button drags, repeated native taps, keyboard activation, viewer/no-write behavior and the formerly failing native tablet rotation journey.

## Workspace focus and native keyboard controls

Space must activate a focused native button. Clicking canvas artwork/background must also return keyboard focus to the workspace, so that Space pans rather than activating the last toolbar button. The canvas is a named, tabbable region with visible keyboard focus. Move/background pointer handling restores that region's focus; inline text editing retains its early event boundary and owns its caret/IME. A browser regression reproduces Copy retaining focus and a missing pan state before the repair, then measures the real40×30screen-pixel pan with no save/history after it. Native button activation and direct text/IME cases remain required.

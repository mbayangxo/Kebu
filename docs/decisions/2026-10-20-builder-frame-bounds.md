# Builder image frames and persisted manipulation — October 20

Assigned scope: COS03/COS04/COS18 and the ordinary Builder capability needed by May. This implements the already requested real image frames and transforms. It does not replace the canonical Builder, restart 3C–3I or certify the cinematic website. Authoritative base: 1829d3f. Claude retains Mail ownership.

## Product and surfaces

Reuse Add section → Cutout collage, canvas selection, Layers/Content inspector, responsive preview, history, save/reload and the public renderer. No new product navigation or separate May-only editor. A photo's visible crop rectangle must be its selection, resize and click target. Cropped-away pixels must not capture clicks. Original media and authored positions, rotations, source stretch, links, motion and unaffected layers must survive.

Journey: select an image, crop it, drag/resize, change phone layout, undo/redo, save/reload, publish and follow its link. Updates use existing canonical operations and SQL authority. Component fixtures alone cannot close this journey.

## Root causes and dependency order

Current rendering clips the image inside a full source-size interactive wrapper. Selection/hit bounds stay too large. Current resizing assumes height is 0.7 of width, mixes x/y percentage scales and saves size/position separately. Width/height/crop maps are absent from the declared section schema and phone override registry. Repair canonical persistence first; reproduce and verify actual frame geometry next.

## Interaction and visual contract

Retain compact orange selection controls, quiet canvas, contextual inspector and navigation. Selection, crop, handles and link share one visible frame, including motion. Shared creative-core resize math handles rotation, Shift ratio and Alt center; keyboard/inspector alternatives remain. One gesture is one atomic patch and one undo step. Locked/view-only objects cannot mutate. No arbitrary z-index escalation.

Do not alter artist pixels for a test. Cropping is nondestructive and preserves old visible content/position. Existing source stretch stays separate from a newly edited frame's height. QA imagery remains explicitly local; owner images are not neutral template defaults.

## Data and rendering architecture

Preserve the section model, adapters and canonical coordinator. Register existing bounded width/height/crop fields through sectionPropsForSave, native normalization and SQL reload. New fields remain optional without defaults so historical published payloads do not change merely by being read. Validate new fields in tablet/phone bags as well.

A later explicit frame-height edit may add optional per-layer source-frame height in scene percentage units, using existing responsive buckets. Missing height preserves intrinsic aspect. No automatic rewrite of existing height-scale/source-stretch values. Final field names/limits require saved-coordinate tests.

Separate positioned source carrier, source-sized motion carrier and the cropped interactive frame. Only the visible frame receives hit testing, outline/handles and links. Keep original source-sized centers/motion percentages. Obtain intrinsic dimensions from actual media, never invented sizes. Explicit scene/carrier refs replace assumptions about offsetParent. Convert visible document-pixel geometry back into source coordinates at commit. Size and position are one patch. Include responsive reset/duplicate/remove metadata.

## State, permissions, integrations and responsiveness

Reuse selection, undo coordinator, serialized autosave receipts/conflicts, asset uploads, mutation APIs, ownership/RLS and immutable snapshots. No new tables or production migration. Real media loading/errors have honest states; missing imagery cannot become invented content. Failed saves keep edits and errors. Responsive changes affect the selected device while preserving desktop and unrelated objects. Keyboard, touch and pointer operate on the same object.

## Completion gates

Reproduce save loss and frame/hit defects first. Verify conversions, rotated anchors, modifiers, source preservation, validation and responsive/adapter roundtrips. Exercise the actual Builder → migrated isolated PostgreSQL → history → reload/publish, owner/refusal and immutable output. Inspect desktop/tablet/phone screenshots, click outside crops, links, reduced motion, touch/keyboard and delayed/failed media. Preserve existing visible composition.

Run full CI, migration hygiene and 3C–3I/3J regressions; publish an expected-head checkpoint only after actual checks. Hosted users/provider quality/reference fidelity/full May remain separate open gates. This blueprint records routine implementation choices within the user's authorized completion scope.

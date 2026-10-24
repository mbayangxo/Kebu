# Content-preserving Studio style transfer

COS01/11/18 require reusable styling, page backgrounds and atomic history without replacing authored content. This slice uses the existing editable document, permissions and serialized save path; it adds no database schema or external clipboard transport.

One selected object can supply a style snapshot. Paste applies shared visual effects to unlocked selected/grouped objects; typography transfers between text, paint between shapes/lines/frames, filters between image/video, and icon color/size between icons. Only an explicit style-property allowlist transfers. Text/glyph content, source media, crop, IDs, groups, transforms, timing, animations and provenance remain authored. Missing optional style values clear the previous override. An unchanged paste is a no-op; one paste is one undo step. Viewers cannot copy/paste through mutation controls.

Page style snapshots contain background and transition kind/duration, preserving page identity, content, order, dimensions and scene duration. Background can also be applied to all pages in one action. These operations preserve the active-page mirror and reject invalid style data atomically. The internal clipboard lasts while the editor is open, and its source is named in the inspector.

Acceptance includes matching and mixed object types, grouped/locked objects, clearing overrides, no-op identity, invalid input, active-page mirroring, undo/redo, save/reopen, phone controls, viewer restrictions and decoded exported page backgrounds. The existing managed hosted acceptance remains a separate gate.

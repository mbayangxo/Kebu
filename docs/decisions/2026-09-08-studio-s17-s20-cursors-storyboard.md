# ADR: Studio S17–S20 + S9b + storyboard compile

## Decision

Ship Design OS backlog in blueprint order, then CapCut storyboard compile:

1. **S17 Folders** — `studio_folders` + `create_designs.folder_id` (**077**)
2. **S18 Versions** — `studio_design_versions` autosave checkpoints + restore (**078**)
3. **S19 Elements** — structured line / frame / icon layers (no new table)
4. **S20 Comments** — async `studio_design_comments` (**079**)
5. **S9b Live cursors** — Supabase Realtime Presence (no migration)
6. **CapCut V2 storyboard** — scene list + compile to video track on `/studio/video/[id]`

## Not CapCut-complete

Still later: Quick Edit montage wizard · clip speed UI · auto captions · chroma · pro color · nested sequences.

## Apply

`APPLY_077_THROUGH_079.sql` after 076.

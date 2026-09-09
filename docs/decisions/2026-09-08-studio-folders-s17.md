# ADR: Studio folders (S17)

## Decision

Studio design library gets **owner folders** (`studio_folders`) with `create_designs.folder_id`.

## Rules

- Flat folders (no nesting) in this slice.
- Owner creates / renames / deletes folders; delete unfiles designs (`ON DELETE SET NULL`).
- Only owner can move designs between folders.
- Shared designs stay in “Shared with me” (not in owner folders).
- Missing migration → honest 503 on folder APIs / move.

## Out of scope

Nested folders · folder sharing · video project folders · version history (S18).

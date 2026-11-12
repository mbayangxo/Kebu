# 3C S5 page lifecycle operations — proposed, awaiting user decision

Status: **Recommended direction APPROVED by the user, 2026-10-03.**
Implementation contract: `3C-S5-page-operations-design.md`.

## Problem

The approved operation vocabulary in `docs/product/3C-DESIGN-FREEZE.md` §5
contains node operations and `setDeviceComposition`, but no page lifecycle
operations. `POST/PATCH/DELETE /api/projects/[id]/pages` currently inserts seed
sections, updates page metadata/layout, or cascade-deletes nodes directly.
Those writes cannot participate in operation Undo/Redo, idempotent replay or
expected-version conflict handling. Flushing one browser cannot prevent another
editor from making a concurrent page mutation.

For opted-in KCD drafts, the legacy page routes now return a visible 409 before
any page/section write. The original 3B route continues unchanged. This is a
temporary development guard, not completed KCD page editing. Operation editing
remains behind its default-off QA flag.

## Recommended decision

Extend the frozen KCD operation model to cover page lifecycle changes now,
within S5, rather than signing off a Builder whose page controls bypass history.

- Add page insertion, metadata update, reorder, removal and same-id restoration.
- Page insertion plus starter sections is one atomic transaction; one history
  action restores/removes the entire page and its seed content.
- Page removal restores the same page/node ids and device layouts on Undo, with
  current restore versions, while preserving the one-page minimum.
- Version checking covers the affected page metadata/order as well as its layout;
  specify how it shares or extends the existing `layout_version` contract.
- Retain tenant checks, editor permissions, slug uniqueness, safe-content rules,
  bounded history, immutable replay and one bump per touched row.
- Keep project-level site chrome a single source; nav reconciliation must be
  included safely or explicitly report failure without claiming completion.
- Add core/inverse/property tests, QA transaction/concurrency/RLS tests and
  authenticated Add/Rename/Reorder/Delete → Undo/Redo → reload browser journeys.
- Use a follow-up migration. Do not edit the frozen 3B checkpoint or the S4
  migration. No production application, deployment or release is authorized.

The detailed version/nav/inverse design must be recorded before implementing
this extension; this proposal does not silently choose new database semantics.

Alternative: keep page lifecycle changes outside session Undo/Redo as explicit
versioned lifecycle commands, flush and invalidate history on success, and
confirm destructive actions. This requires a documented exception to the S5
“edits emit transactions” direction and separate concurrency/idempotency design.
It retains the simpler node vocabulary but gives users less consistent history.

## Independent unresolved findings

Catalog synchronization (`sync-catalog-to-sections.ts`) still rewrites product
section props directly from catalog routes and Studio product export. It needs
an operation-backed, conflict-safe synchronization boundary; it has not been
fixed or claimed complete here. React section memoization and Tablet/Phone
edit-to-canvas measurement also remain required before performance sign-off.

# S5 page operations — approved direction and implementation contract

2026-10-03. The user approved the recommended extension in
`3C-S5-page-operations-proposal.md`: atomic, undoable page lifecycle operations.
This authorizes development and follow-up migration files only; production and
release restrictions remain in force.

- Vocabulary: insertPage, updatePage (title/slug), movePage (orderKey), removePage,
  restorePage (recorded page and its nodes). Insert plus seeded node operations
  is one transaction and one history action.
- `layoutVersion` / `layout_version` becomes the shared page version for metadata,
  ordering and device layouts. Existing pages bump once per transaction. New
  pages start at 1; restored pages and nodes use recorded version + 1.
- Add `project_pages.order_key` for persisted fractional page ordering. Backfill
  from current sort order. The 3B path still uses sort_order. KCD writes derive
  sort_order from final page ordering. Do not modify S4 or frozen 3B migrations.
- Remove requires the original page version AND every node version on that
  page, so a concurrent content edit cannot be deleted silently. The final
  document must retain 1–12 pages, unique slugs/order keys and disjoint page/node
  ids. Nodes restore parents first, preserving ids, placement and device layouts.
- Add `project_pages.kcd_unknown` to preserve foreign page extension data across
  storage and Undo/Redo. Adapter-only legacy shadows remain out of persistence.
- History tracks removed page identities separately from removed nodes. Replies
  include canonical changed pages and removedPages; malformed/missing canonical
  replies remain uncertain and cannot move history or mark a draft saved.
- Protocol increments for the new database/API contract; no runtime activation
  without the matching migration and existing QA flags.
- Navigation remains the explicit source chrome synchronization path. Page
  lifecycle success must separately reconcile it or visibly report/queue the
  failure; it must not silently mutate projected chrome nodes. Required browser
  journeys cover this failure state before sign-off.
- Existing authorization/RLS, project lock, immutable transaction IDs, bounded
  payloads/history, content guards and idempotent journal remain intact.

This is an implementation contract, not S5 completion or QA sign-off.

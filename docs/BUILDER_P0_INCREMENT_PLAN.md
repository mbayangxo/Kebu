# Builder P0 Stabilization — Increment Plan

Branch: `work/builder-p0-stabilization`
Parent: `work/kebu-ecosystem-ux`
Rule: do not merge to main or deploy merely because an increment was committed. Each increment must pass its evidence gate.

## Increment 0 — Template isolation and baseline
- Owner portfolio seeds (May Lecor, K-Direction and other private portfolio sites) never appear in public template discovery.
- Public gallery uses ordinary reusable templates only.
- A user can start a genuinely new site from a public template without inheriting owner identity/assets/content.
- Preserve owner portfolio sites as compatibility fixtures for Builder torture testing.
- Capture current Builder browser behavior before broad refactors.

## Increment 1 — Editor shell and contextual inspector
- panel closed by default
- rail click opens/closes deterministically
- canvas selection opens only relevant inspector
- remove unrelated/duplicate controls
- compact professional grouping/typography/spacing
- fix nested scroll/canvas squeeze
- contextual AI entry, closed until invoked
- regression screenshots + browser tests

## Increment 2 — Core authoring and persistence
- text direct edit + typography
- image replace/crop/fit/position
- layer front/back ordering
- section insert/reorder/duplicate/delete/hide
- undo/redo
- autosave/manual save truth states
- refresh/reopen exact persistence
- Supabase/RLS/tenant evidence

## Increment 3 — Site structure
- pages CRUD + nesting
- header/footer/nav fully editable/removable
- horizontal/vertical/responsive nav
- logo replace/size/alignment
- responsive desktop/tablet/mobile overrides
- long scrollable pages
- forms/blog/SEO/domain consolidation

## Increment 4 — Media, motion and offline
- structured animations for text/image/logo/section
- asset lifecycle/reference safety
- offline operation log
- reconnect/conflict behavior
- old project compatibility fixtures

## Increment 5 — Publish and public quality
- preview/live semantic parity
- publish/update/rollback
- accessibility
- performance budgets
- error observability
- broken-media/link validation

## Increment 6 — Shop activation and commerce
- Activate Shop idempotently
- catalog/variants/media/inventory
- Shop page/gallery presentations
- cart/checkout/payment/order
- fulfillment/return/refund
- ledger/inventory/analytics reconciliation
- destruction tests

## Increment 7 — Flagship proof
- May Lecor site edited and published using ordinary Builder commands
- new generic site created from public static gallery
- no owner-specific template visible to normal users
- no manual DB/code intervention for either flow
- capability ledger updated only from test/runtime evidence

## Bug policy
For every reproducible defect:
1. reproduce
2. add failing regression test when practical
3. identify root cause
4. fix root cause rather than mask symptom
5. verify persistence/auth/offline/cross-product consequences
6. rerun affected critical journey
7. commit the smallest coherent slice

No agent may mark an increment complete based only on source inspection or component rendering.

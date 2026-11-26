# Builder acceptance continuation — October 15, 2026 UTC

Working branch: `work/kebu-completion-audit-oct13`; parent `cb66f7c`. Preserve the integrated 3C–3I source. This is a continuation of the 99-group audit, not a whole-product or 3J sign-off.

## Repairs

- Reconnected the completed 3H Brand Brain authoring surface to `/studio/brand`. The earlier reconciliation retained its components/APIs but left the older page in front of them. The running-app extension suite reproduced the missing Brand name/Save Brand Brain controls; restoring the QA wrapper makes existing authoring, image curation, attachment and application journeys pass. The current original DNA page is preserved byte-for-byte at `/studio/brand/legacy` (SHA-256 `5fbb32e69a238b5d08b6e28e2bce8a5dedc52120dafd03e38d3b7c8ec2417896`). This is route reconciliation, not a restart of 3H. Removed the stale authoring footer sentence saying AI generation is a later phase, since the preserved 3I experience engine is already present.

- Legacy page deletion requires a returned, project-scoped deleted row and returns its exact identity. A zero-row deletion is a conflict, not success.
- Legacy page order responses come from returned database rows. Missing, duplicate or differently ordered receipts are refused. Navigation synchronization failures are reported and queued rather than hidden.
- The actual page panel verifies create/rename/delete/reorder receipts, keeps unconfirmed forms visible, and restores the prior visible order after an unconfirmed legacy reorder. Native ordering remains owned by its operation coordinator; the panel no longer independently overwrites that projection.
- Page actions and edit fields have labelled, 44px touch areas on phones, and desktop keyboard focus reveals row actions. Existing compact desktop layout is preserved.
- Reproduced the page selector/save-status overlap at 1,024px. Removed absolute page-selector positioning, kept it in normal flow, and allowed the action group to wrap below 1,280px. The 390/640/768/1,024/1,440px non-overlap cases pass.
- Connected Experience DNA/engine controls to the existing appearance scope and native control color scheme. Their existing token usage now follows Builder Auto/Light/Dark rather than falling back to bright white. The site canvas remains outside that scope.
- Native QA now copies current application sources and the installed dependencies into a disposable source directory. All fixture routes, Next configuration changes, caches and generated types stay there. Child shutdown is awaited; results include cleanup receipts. The working checkout is independently checked afterward.

## Final verification

| Gate | Verified result | Boundary |
| --- | --- | --- |
| Full local CI on Node 20.20.2 | Exit 0; 5,929 passed / 168 environment skips; 357 passing files / 22 skipped; lint 0 errors / 348 existing warnings; 221-page build | Matches the repository's configured Node 20 major; no GitHub workflow triggered |
| Additional local CI on Node 24.19.0 | Exit 0 with the same test/build gates | Current workspace runtime |
| Combined native browser suite | **148 passed, zero skipped, zero unexpected, zero flaky**, 607,688.584 ms | Real components; controlled API/Auth transport; migrated local SQL bridge for 3J |
| Public navigation repetition | 18 passed, zero skipped/unexpected/flaky across three runs | Diagnostic local fixture, not stable hosted acceptance |
| Network ownership/visibility/trust/retention SQL | 18 passed | Isolated PGlite 0.5.8 roles/policies, not hosted gateway Auth |
| Migration hygiene | 72 canonical timestamp versions, no executable legacy bundles | Source inspection, no remote migration application |
| Cleanup | Both children stopped; sandbox removed; independent follow-up confirms no fixture routes/temp configuration and unchanged working `next.config.ts` | No test fixtures are installed into the working checkout |

The route regression was run against the previous source and reproduced false success for zero-row deletion/incomplete ordering and hidden navigation failure. Repaired receipt/helper tests pass. Actual browser cases preserve unconfirmed forms, restore unconfirmed legacy order, retain history and verify native page/section operations without legacy writes.

The strengthened 3J journey uses the actual Publish button and settings confirmation, executes local SQL settings/publication, verifies one live deployment row and observes the published UI receipt. This publication is **local only**. Browser routing/Auth remains controlled; the actual hosted HTTP authorization/storage/provider boundary is not established by this harness.

The combined suite exercises Brand Brain four-profile authoring, curated images, attachment, application/detach, failures, reload and legacy editor access; Experience DNA/engine review/confirmation/Undo/Redo/recovery; all native geometry/order/constraints/media/effects/rich-text/conversion workflows; phone/keyboard page management; manual light/dark persistence of draft text and unchanged authored site colors; generated-page navigation with and without JavaScript; reduced motion and tampered-snapshot refusal. Completed 3C–3I source was reconciled and regression-tested, not rebuilt.

### Timing baselines

All 18 optional development probes ran: legacy-section and native 100/500/2,000-node editing at desktop/tablet/phone sizes. Each records two warmups and seven samples. Native medians span 97.5–132.5 ms; legacy medians span 94.1–330.7 ms. These include Playwright commands and animation-frame waits, use controlled authority and exclude hosted Auth/SQL/network latency. They are not production SLA passes or real-device/stable-host performance sign-off. Complete samples, runtime, selected suites, source fingerprint and cleanup receipts are in `evidence/kebu-builder-acceptance-oct15.json`.

Screenshots reviewed include the 1,024px header, phone page controls, Brand Brain attachment and Experience controls in both appearances. Native direction panels now follow the editor palette while the authored canvas keeps its colors. This is not a whole-product visual/reference sign-off.

### Rejected extended runs and navigation evidence

Extended runs found stale `Sections`/`Photos`/`Use` selectors, the old 640px page-selector breakpoint, old Undo span markup, and an incomplete settings response in the publication fixture. These fixtures now match the reconciled UI and settings receipt contract; checks were not deleted or silently bypassed. The same run exposed the real route/header/appearance omissions described above.

Two public JavaScript tablet navigation attempts failed to reach the next page. Diagnostics now record URL boundaries, browser pointer/click targets, removed anchors and console errors; generated public fixtures use the same public-site header as production routing. The isolated five-page suite subsequently passed all 18 cases across three repetitions. No application navigation fix is claimed from that observation alone. The later combined 148-case run also passed all public navigation checks. Failed attempts remain rejected evidence; stable hosted navigation remains a 3J gate.

## Read-only hosted parity

The connected Kebu production project inventory contains only `tnygqgcqlnlsmjpygrca`. System-catalog and migration-history reads confirm the checked native Builder functions/tables and the Studio/work identity guards are absent; the older Network and room-file insertion policies remain. Anonymous Network INSERT privilege is **false**, while SELECT privilege is **true**; the permissive legacy insertion policy alone must not be described as proof of anonymous production writes. No production rows were modified to test exploitation.

Raw read-only evidence: `evidence/kebu-production-parity-oct15.json`. This is a release blocker, not authorization to change production. The source-only ownership/storage/identity migrations still require fresh hosted-bootstrap rehearsal, hosted acceptance and explicit production approval.

The Supabase project cost tool returned `UNAVAILABLE` (`get_cost was not returned by tools/list`). No cost was quoted or confirmed, and no QA project was created. The isolated hosted plan remains `KEBU_HOSTED_QA_PLAN_2026-10-14.md`; no upgrade, production pause, merge, push or deployment occurred.

## Acceptance still open

Full 3J real-provider/reference quality, authenticated S8, independent PostgreSQL sessions, stable production-like performance and release approval remain open. Native page nesting and original font/asset issues remain explicit. Legacy multi-page writes still need independent hosted concurrency acceptance; row receipts do not make the historical reorder upsert a complete concurrency protocol. Advanced Studio, full everyday products and larger platforms retain their original 99-group scope.

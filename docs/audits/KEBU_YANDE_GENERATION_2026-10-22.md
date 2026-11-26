# Builder/Studio generation authority — October 22, 2026

Runtime **10906ee18966b22217cddcd1e6c7bacced4f6405** is integrated and reread on the authoritative recovery branch. Source generation implementation is886baa30f4fd12b6f2367ba3bc19f8c77123790c; the follow-up changes exactly four Studio component/test/harness/workflow files. All18 candidate blobs were reviewed against the recovery comparison. Claude Mail/fonts and completed3C–3I remain preserved. This bounded slice does not complete Yande, Studio, Builder or the99-group audit.

## Behavior and provenance

Direct tip-to-tip comparison with older Studio2048 source confirmed that shared-gateway changes were absent. Website and Studio design/campaign generation now use the existing Yande transport, shared identity and usage logger. API routes pass the authenticated session user rather than accepting a client-supplied owner. Pure local template/design helpers lazily load privileged generation code only when needed.

Builder retains its configured model override/default, adaptive thinking,60-second timeout, no automatic provider retries, exact requested page validation, one schema/page repair attempt, and safe503/502 responses without fabricated sites. The gateway supports those existing settings. Generator calls accept only a nonempty completed end_turn; valid-looking JSON with truncation/refusal/pause/tool/context-window stop states is rejected. Failed completed-response validation records actual returned token counts. Studio uses the existing shared model and returns real editable canvases from validated structured copy; its established local engine remains explicitly usedAi:false/fallback:true when no provider result is used. No real provider output quality was tested.

Two genuine route defects were exposed by behavioral regressions: campaign generation bypassed the allowance reservation used by the other Studio route, and both generation routes lacked executable cross-origin checks. They now reject cross-origin requests before authentication/quota work and reserve one attempt before configured-provider work. Whitespace-only credentials do not reserve a provider attempt. Failed quota checks do not generate or persist designs.

Older Builder improvement and native Experience gateway reconciliation remains open. Other legacy AI endpoints also retain direct provider calls; this checkpoint does not claim global centralization, learning, fine-tuning or memory.

## Gates and exact source attribution

| Gate | Verified result | Revision / run / job |
| --- | --- | --- |
| Original generation baseline |18 expected failures/6 passes,24 executed; specific owner, quota and cross-origin failures required |49c139b2 baseline / [39726303466](https://github.com/mbayangxo/Kebu/actions/runs/39726303466) /119650873342 |
| Repaired generation |24 SDK/HTTP/route cases +4 actual usage-table SQL cases,0skip |886baa30 / same run/job |
| Full CI |6,560 passes/338 explicit skips;409 files pass/48 skip; TypeScript,0lint errors/346 existing warnings, finalized230-page build |10906ee1 / [39726904444](https://github.com/mbayangxo/Kebu/actions/runs/39726904444) /119652779235 |
| Studio |44 full +2 native touch cases across3 mandatory independent runs=50 passes;0skip/unexpected/flaky; cleanup true |10906ee1 / [39726904445](https://github.com/mbayangxo/Kebu/actions/runs/39726904445) /119652779108 |
| Platform |20 actual SQL suites;7 Mail +13 Liguey +1 locale browser passes;0skip/unexpected/flaky |10906ee1 / [39726904413](https://github.com/mbayangxo/Kebu/actions/runs/39726904413) /119652779170 |
| Builder |77 actual browser cases;9 strict performance probes retained; cleanup true |886baa30 / [39726303345](https://github.com/mbayangxo/Kebu/actions/runs/39726303345) /119650872668 |
| Native PostgreSQL |10 unique cases×3 mandatory runs=30 pass; actual independent-session locking and normal cleanup |886baa30 / [39726303361](https://github.com/mbayangxo/Kebu/actions/runs/39726303361) /119650872646 |
| Hosted public |533 pass/35 explicit skips; signed-in hosted26 not executed |10906ee1 / [39727065253](https://github.com/mbayangxo/Kebu/actions/runs/39727065253) /119653294878 |

Builder/native/backend gates are attributed to886baa30, not falsely described as rerun at10906ee1. The follow-up changes only Studio gesture observation, its test, its harness and its workflow. Backend, Builder and SQL runtime files are byte-identical. A prior full local CI passed6560/338 but overlapped later refinements; exact remote CI is the final result. Final local TypeScript passed with6GB heap; changed generation files lint clean; the existing Studio component retains five warnings.

The installed Anthropic SDK makes actual HTTP requests to an explicit loopback provider fixture in transport tests. Usage insertion and route authentication/allowance/persistence are recording fixtures there. Separate tests apply actual canonical usage-table SQL/RLS in PGlite. Native tests use PostgreSQL17.6 with synthetic auth fixtures. These are deliberately different evidence layers; no combined managed hosted browser→GoTrue→PostgREST→provider proof is claimed.

## Studio touch follow-through

The first generation candidate's Studio run39726303430 failed after35 passes: selection remained but the next Inspector tap did not open the panel. It was rejected for integration. The existing raw-CDP touch test had no observable gesture-completion barrier. The follow-up exposes current gesture state as a data attribute and waits for React to become idle and resized width to change before starting another touch sequence. It explicitly asserts Inspector aria-pressed, records native click/pointer events and retains failure traces/screenshots. It does not force clicks, sleep through failures, skip cases or add retries. Six independent phone/tablet passes plus the full44 now pass. This is a synchronization/observability refinement; no new product-selection fix beyond the previously verified8f4225e0 behavior is claimed from it.

Existing Studio desktop/phone/tablet screenshots and decoded exports remain recorded in the selection audit. No font design/assets were changed. The local execution service disconnected again after final source was safely pushed; subsequent review/evidence updates use connected GitHub APIs with expected-head, force:false writes.

## Deployment and production preflight

READY preview: https://kebu-dbssshi2i-mbayangxos-projects.vercel.app, deploymentdpl_DTFVZfQ4qwZbBR5sYy6UNeCah544, exact10906ee1. Production metadata was freshly reread separately and remains71815f99c50022482e545e22e1f6e040ee1cafe4, not this candidate.

The new read-only scripts/hosted-yande-preflight.sql returned **4 failed/7 checks** at2026-10-22T05:16:18Z on productiontnygqgcqlnlsmjpygrca. Existing account_ai_usage_events, studio_generation_runs and studio_campaign_projects have RLS. The reservation RPC and yande_interactions table are absent. Authenticated sessions still have usage-table write grants under an owner policy, whereas the canonical atomic reservation migration revokes those writes. No user rows or application RPCs were read/executed. See [production-preflight.json](evidence/yande-reconcile-oct22/production-preflight.json). This bounded inventory does not replace or exhaust the older22/37 broader failures.

### Concrete staging prerequisites — not executed in production

Reconcile actual schema/history and rehearse the existing canonical files in an approved isolated hosted target:
1.20261010134141_atomic_account_ai_reservations.sql — service-only invoker reservation function and usage-write revocation; SHA25603b148eb0f84450664f00e6d97b0434cf386fe5cd2a2ba0e39ca16cc1663b420.
2.20261020001000_yande_shared_gateway.sql — new interaction table/indexes, service writes and owner-only reads; SHA256ab168f43ffaa2dbbe9e8918578d2aef8404e2ef3d9ac79381e57d6cd62c36110.

Observed usage columns and action checks match those required by this bounded reservation path. Preserve current usage rows; do not blindly replay migration history, delete records or claim these two files cover every platform prerequisite. Verify actual hosted owner/stranger/anonymous behavior, quota races and authenticated generation after rehearsal, then review exact production changes alongside the wider98-file reconciliation. Existing QA access is denied, so that hosted step remains blocked. No project/paid branch was created.

No production migrations, DNS, promotion, real API charge, outgoing email/payment or destructive action occurred. Real provider credentials/quality, private paid-file delivery, hosted26 and full May/Studio/Builder/3J/99 acceptance remain open.

Primary protocol reference: [Anthropic stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons). Current installed SDK types were checked before forwarding thinking/model/timeout options.

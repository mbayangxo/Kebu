# Developer template source boundary — October 22, 2026

Runtime **5be2e0379be5bf8dc9101055038a54f6abf54d06** is integrated and reread on the authoritative recovery branch. Published store/developer queries now return metadata only. Column grants block direct definition reads, whole-row projections and source-filter inference; unpaid library snapshots are hidden. Trusted server checkout still snapshots the purchased source, and verified Wave settlement exposes the unchanged owned snapshot once. Anonymous metadata works without developer-profile grants. Creator uploads/publication and personal source uploads pass actual Data API verification.

All seven exact-source gates passed: **14 actual SQL + 10 real PostgREST/PostgreSQL cases**, zero skips; original baseline **eight failures / six passes**; full CI **6,526 passes / 338 explicit skips**, zero lint errors / 347 existing warnings, TypeScript and build; Builder **77/77**, platform **20 SQL suites / 21 browser cases**, Wave **64 HTTP/adapter + 13 SQL + six native race passes**, original native **30/30**, public preview **533 passes / 35 explicit skips**. The disposable REST database was dropped normally after connections stopped. READY preview: https://kebu-i3t9tffb3-mbayangxos-projects.vercel.app. Evidence: `audits/KEBU_TEMPLATE_SOURCE_2026-10-22.md`.

**Not release certification:** PostgREST uses synthetic fixture JWTs, not GoTrue/managed hosted authentication; provider replies are explicit fixtures and no real money moved. The new 98th canonical migration remains production-unapplied. Creative-asset private file delivery, other provider proofs/refunds, authenticated hosted 26-case acceptance, schema reconciliation and full Kebu/May/Studio/3J/99-group completion remain open. Production was not promoted or migrated; no DNS or paid infrastructure change. Preserve Claude's Mail/fonts and phases 3C–3I.


## Root cause and repair

The published-row RLS policy granted access to the entire purchasable definition. An unpaid buyer could also read its pending or failed library snapshot. Filtering the store response would not stop direct Data API requests. The forward-only migration removes table-level and definition-column SELECT grants, explicitly grants metadata columns, and restricts browser library reads to owned snapshots. Developer upload/publication uses metadata RETURNING; server acquisition reads source through the existing authenticated checkout authority. No definer function/view, content rewriting or ownership fabrication was added.

An anonymous metadata policy is separate from authenticated developer predicates so it works without broad grants on developer_profiles. The actual REST fixture removes every anon grant on that table before testing. Table-level grants must be removed as well as column grants: see the primary [Supabase column security documentation](https://supabase.com/docs/guides/database/postgres/column-level-security).

## Verification

| Gate | Result | Exact run / job |
| --- | --- | --- |
| Source boundary | Eight expected baseline failures / six passes; repaired 14 SQL and ten real REST passes, zero skips; normal database cleanup | [39688960571](https://github.com/mbayangxo/Kebu/actions/runs/39688960571) / 119530059459 |
| Full CI | 6,526 passes / 338 explicit skips; 406 files pass / 48 skip; zero lint errors / 347 existing warnings; TypeScript and finalized build | [39688960533](https://github.com/mbayangxo/Kebu/actions/runs/39688960533) / 119530059300 |
| Builder | 77 pass; zero skips/unexpected/flaky; nine performance probes retained | [39688960538](https://github.com/mbayangxo/Kebu/actions/runs/39688960538) / 119530059284 |
| Platform | 20 SQL suites and 21 browser cases | [39688960551](https://github.com/mbayangxo/Kebu/actions/runs/39688960551) / 119530059297 |
| Wave | 64 HTTP/adapter, 13 SQL and two native races across three mandatory runs = six pass; zero skips | [39688960529](https://github.com/mbayangxo/Kebu/actions/runs/39688960529) / 119530059204 |
| Original native | Ten unique cases across three mandatory runs = 30 pass; zero skips | [39688960514](https://github.com/mbayangxo/Kebu/actions/runs/39688960514) / 119530059208 |
| Hosted public | 533 passes / 35 explicit skips; no signed-in hosted acceptance | [39689077280](https://github.com/mbayangxo/Kebu/actions/runs/39689077280) / 119530453674 |

The actual application functions upload/publish developer listings, read store metadata, initiate acquisition, persist the quote, refuse unpaid source reads, complete/replay verified settlement and read owned source over the real PostgREST server and PostgreSQL. Personal uploads retain their definition. Source inference through REST filters returns permission denial. Synthetic JWTs and provider replies are explicitly isolated fixtures. This is not GoTrue, browser session, live merchant or managed hosted acceptance. No new marketplace visual acceptance is claimed from backend tests.

PostgREST16.5 is pinned to observed digest sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc. PostgreSQL17.6 uses the existing pinned manifest. The migration filename was actually created with pinned Supabase CLI2.121.0 in isolated run39687442302/job119524985778 after command help discovery. Local execution was unavailable for final source verification; Actions supplied the exact-source results. The local execution service subsequently recovered; its preserved dirty Wave workspace was left intact and a new worktree was created at the verified recovery head.

## Reconciliation and remaining work

Claude's work/claude-sync-oct20 head68b62904 is an ancestor of recovery. The older Studio2048 branch differs in history: a direct tree comparison found152/181 Studio files identical and no missing paths. Direct source checks confirm save queues remain, but marquee selection/helper is absent; reconcile it into the newer editor instead of replacing resize/text/history work. Older shared-Yande call-site differences require separate review. These findings are not proof every historical branch change is integrated.

Creative-asset private file delivery, other payment providers/refunds, real credentials, authenticated hosted26 acceptance, source schema reconciliation and all broader product acceptance remain open. The prior37-check production preflight had22 failures; it is not an exhaustive check of every new Wave/source prerequisite. Production remains the last observed71815f9 deployment; no production schema, DNS or promotion changed in this checkpoint. See [verification.json](evidence/template-source-oct22/verification.json).


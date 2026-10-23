# Independent Studio group copies — October 23, 2026

Runtime: `f9a07857f2b0a0b54913af529aacc0d82990658b` on `work/codex-resume-oct23`. Implementation checkpoint; full product and hosted release acceptance remain open.

## Defect and repair

Duplicating a selection retained its original `groupId`. Group expansion during subsequent keyboard movement/selection could therefore include the source artwork. Page duplication and clipboard paste also retained group identities. Copies now receive one fresh identity per source group per copy operation: membership is retained inside the copy, distinct groups remain distinct, ungrouped objects remain ungrouped, and repeated copies stay independent. Page copies retain exact positions/names. Source arrays and authored media are unchanged.

The original helper regression failed (1 failed / 6 passed) because selecting the duplicate selected the source. Final focused helpers: 18 passed across three suites. The new actual-editor browser case groups text/image, duplicates, moves, saves, undoes, saves, reopens, selects/moves the copy and verifies both originals remain unchanged. It passed locally with zero skips/flaky/unexpected cases, normal harness teardown and an inspected editor screenshot. API/Auth are explicit isolated loopback fixtures; this does not establish hosted persistence or JWT/RLS acceptance.

Local default-memory CI initially exhausted the Node heap. The increased-heap run found a test annotation error, which was corrected in `f9a07857`. Local final TypeScript and lint pass (0 errors / 346 existing warnings); 6,604 tests passed and 338 explicitly skipped. The full local CI chain, including the finalized production build, passed with Node heap raised to6144MB. Migration hygiene passes all98 unchanged canonical migrations. The full local Studio browser gate passed45/45, zero skips/unexpected/flaky, normal cleanup. Exact remote CI[39905270591](https://github.com/mbayangxo/Kebu/actions/runs/39905270591) passed. Exact remote Studio[39905270558](https://github.com/mbayangxo/Kebu/actions/runs/39905270558) passed45 full cases plus six mandatory phone/tablet touch passes across three rounds, zero skips/flaky/unexpected; its preserved original marquee regression failed as expected. Public smoke39905615702 is still running at this checkpoint. Original remote `c27d3337` CI failed on the same test typing; its browser run is not final-source certification.

## Reconciliation

Started with the requested handoff, inspected remote branch tips, and obeyed the workspace gate before editing. Studio marquee was five commits behind the designated recovery checkpoint; fast-forwarded to `4d2d96d42ab92a47386c2c6b2e8aba168c956cec`. This base already contains Claude sync (34 commits behind base), hosted release (24 behind), hosted-auth gate (22 behind), payment adapters (33 behind), Builder frame verification and Studio marquee. No replay of old checkout tasks. Older Claude migration branch diverges (648 current-only/56 old-Claude-only relative to base), so it remains separate. No Claude branch changed. Git CLI push lacked credentials; GitHub connector uploaded the identical local tree `a4d1523d52591d90673fd9b3d449608d8001fc7a`, then the type correction. Original remote history/authors remain intact.

## Hosted and deployment boundary

Fresh execution of `scripts/hosted-yande-preflight.sql` against the Kebu project still fails4/7 catalog checks: reservation RPC absent, interaction table absent (table and grants checks fail), and authenticated writes remain granted on the usage table. Three existing table/RLS checks pass. No application RPC, user row or mutation was executed. This does not certify JWT/RLS, publishing, integrations or the26 signed-in hosted cases. Existing isolated-QA access/configuration remains unresolved.

Vercel provider read confirms production READY on `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2` / `71815f99c50022482e545e22e1f6e040ee1cafe4`. Runtime preview `dpl_GHGJ5mPZBrcFtfCmeXgWJag65WUA` is now READY at https://kebu-ifzsdaiu8-mbayangxos-projects.vercel.app (provider rechecked). No production migration, promotion, DNS, ownership or real payment/provider call.

COS01/07/11/18 gain bounded copy-isolation evidence only. All25 Creative OS groups, ordinary hosted acceptance, May portfolio reference work and overall Builder/Studio completion remain open.

The session-handoff branch contains only two documentation commits beyond main. Its richer current handoff is explicitly retained when reconciling that documentation history; no divergent application changes are imported. PR: https://github.com/mbayangxo/Kebu/pull/12 (shared recovery target, not main).

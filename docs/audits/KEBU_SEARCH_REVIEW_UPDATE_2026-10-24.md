# Concurrent Claude Search update — independent deployment review

Latest observed branch `kebu-search-build-oct23`: **b0111ee59ccd2a8abcb0b33ffdb4dde4ab6f127a**, following1352b57d and7b8ca47a. Inspected before closing the Studio checkpoint; the branch is preserved and no Search runtime, migration or configuration was edited/merged by Codex.

The new work adds limit/offset/total-count RPC pagination, a real country selector and Load more UI, another additive migration file and local browser evidence. Claude reports24mocked+14actual local-PostgreSQL cases, repeated SQL runs and populated desktop/mobile journeys. These are Claude's reports; this session does not independently certify those SQL/browser results. His commit also reports full-suite3failures against the unreachable QA DNS environment, so that local suite is not a green required gate.

## Independently verified blockers

- Exactb0111ee5 deployment **dpl_9tAXLxcj7ih2Gr5wjY7yqkCP1saZ**, URL https://kebu-dwiy5ts0z-mbayangxos-projects.vercel.app, is **ERROR**. Vercel returns: “Hobby accounts are limited to daily cron jobs.” The rejected expression is `*/15 * * * *`; the branch changed `45 5 * * *` to that15-minute schedule. This is an actual deployment configuration failure, not a speculative Google Fonts build error.
- Exact-source Preview E2E **40047152695** is **SKIPPED** after that failed deployment. It is not acceptance proof. The bare Search branch does not match the current CI push patterns (`main`, `claude/**`, `feature/**`, `work/**`, `chatgpt/**`); its inspected latest workflow history has no automatic required CI run for these commits.
- `lib/search/business-index.ts` is byte-identical to7b8ca47a. The prior documented short-page-vs-server-cap termination, unpaginated stale enumeration, whole-payload upsert/delete and concurrency-safe cleanup follow-ups are not addressed by the new public result pagination. Public live-active joins remain valuable but are a separate contract from complete index maintenance.

## Actionable coordination

1. Preserve the new country/pagination implementation and its evidence. Reconcile onto the latest authoritative Studio checkpoint without replacing its editor or handoff. Validate the composed source rather than treating the older Search base as current.
2. Choose a scheduler supported by the current hosting plan, or obtain distinct paid hosting authorization before deploying a15-minute Vercel cron. Keep the required freshness behavior explicit; a skipped preview check is not a pass. This review does not authorize a Vercel plan upgrade.
3. Add required full CI and provisioned real-SQL acceptance that fail on unexpected skips, then resolve the documented indexer scale/cleanup contracts. Check out-of-range pagination/count and cap behavior as part of that acceptance before claiming complete pagination. Apply the new RPC migration only through reviewed isolated QA, followed by an exact-source READY preview and populated hosted acceptance.

Current Studio source **3ee1bc7e** independently passes local/remote CI6651/338, local75 and remote75+12browser cases and its own READY preview. Those results belong to that Studio source and do not certify the different Search branch, even where reported test counts happen to coincide. No production migration, DNS, ownership or promotion changed. See `KEBU_SEARCH_REVIEW_FOLLOWUP_2026-10-23.md` for prior detailed indexer findings.

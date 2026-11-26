# Isolated hosted QA plan — reviewable preparation

Purpose: close real Supabase Auth, Data API, storage and independent-user verification gaps while preserving production and all existing development.

Proposed resource: **Kebu Completion QA**, separate from the active Kebu project. Suggested organization: the connected **Kebu** organization (`zdoqqcrxrbxkbxobjrsp`); user selection required by the project tools. Suggested region: `us-east-1`. Cost has not been quoted or confirmed; no resource creation authorized by this document.

1. Obtain organization selection. Then call the Supabase cost tool for that organization and quote its result. Obtain the tool's cost confirmation before creating anything. Do not pause production or purchase an upgrade to make room.
2. Inventory canonical schema dependencies and rehearse the fresh QA bootstrap. Existing legacy bundles remain archives; do not apply an old all-pending bundle to production. Keep source migrations and schema evidence reviewable.
3. Create only the selected QA resource after cost confirmation. Apply the rehearsed schema and pending protection migrations to QA, including Studio identity, Rooms storage identity and work-item identity guards. Verify roles/RLS/Data API exposure and storage configuration; run advisors there.
4. Use isolated QA keys/server environment, never replace production configuration. Create dedicated disposable test identities without sending invitations or mail to real people. Run the real login UI, work/Studio/Network ownership, storage, save/reload/history/source-refresh and failure flows against QA.
5. Re-run native 3J gates against independent SQL sessions and actual authenticated S8 journeys. Real AI/provider/reference and stable performance evidence remain separately required. Do not equate local bridge/fixture tests with those gates.
6. Record exact source, runtime, migration and test results. Fix failures. Keep merge/deployment, default native rollout and production migrations pending explicit user approval.

The 99 recovered requirement groups remain authoritative. This environment is verification infrastructure; it is not completion of unimplemented product requirements.

## October 15 execution checkpoint

Continued with the connected Kebu organization after the user's continuation instruction. Project inventory read succeeded and lists only the active production project. The required cost lookup for that organization returned `UNAVAILABLE` because `get_cost` was not returned by the Supabase server's `tools/list`. No price or confirmation ID was obtained; no resource was created or paid upgrade purchased. Production remains unchanged. Read-only migration/catalog parity is recorded in `KEBU_BUILDER_ACCEPTANCE_2026-10-15.md` and `evidence/kebu-production-parity-oct15.json`.

Final local October 15 acceptance: 148 browser cases passed without skips or retries; the full CI chain also passed under the configured Node 20 major (20.20.2). These local gates and read-only hosted parity do not authorize provisioning, a paid upgrade, deployment or production migration. The next hosted step remains obtaining an actual project-cost quotation and confirmation through a functioning supported account surface.

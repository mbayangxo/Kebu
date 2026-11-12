# Hosted Builder acceptance and native database teardown

Runtime checkpoint **e3eae02f43c62c034992c36bc24cde81f7533a80**, preserving authoritative PayPal348e80dd and Claude68b62904 work, was expected-head fast-forwarded and reread on `work/kebu-completion-audit-oct13`. No shared history was rewritten. This is verified development infrastructure, not Kebu completion or production acceptance.

## Root causes and repairs

The old authenticated readiness helper swallowed missing-editor failures and actually resolved on the running app's `/login`. Tests used an opaque fake `session` cookie, conditional assertions and incorrect legacy-only actions. The repair requires the real Site canvas and Save draft, rejects sign-in/public previews, parses genuine Supabase cookie names/chunks without leaking values, scopes native selection/actions, and measures the real editor sidebar and canvas at390/430/768/1024/1440px. Local actual-component/SQL journeys verify text save/reload, insertion/history, page CRUD and root ordering/removal. Fixture authentication is explicitly not hosted Supabase authentication.

The separate strict hosted runner requires a separately approved origin, committed source, an actual owned disposable native project and explicit mutation acknowledgement. All26 cases must pass with no skips/retries/flaky results. Credential-free source verification checks the authoritative SHA, exact-source CI and Vercel-bot successful Preview status at that exact origin. Actual read-only verification against348e80dd passed; wrong-origin and missing-configuration checks failed closed. The protected push workflow avoids the default-branch deployment_status trap, serializes shared fixtures, supplies secrets only to the test step and uploads only a sanitized summary. Setup and reviewer requirements: [HOSTED_BUILDER_ACCEPTANCE.md](../testing/HOSTED_BUILDER_ACCEPTANCE.md).

Candidate b9977a8e passed nine native PostgreSQL assertions but failed with two unhandled57P01 connection-termination errors. Forced DROP raced backend socket shutdown after pool.end(). e3eae02f drains actual database sessions before ordinary DROP DATABASE, refuses non-generated fixture database names and fails closed on active sessions. The regression holds a real backend alive, verifies teardown refusal without killing that session, then releases it and confirms cleanup. No errors were suppressed. The workflow now requires three consecutive successful runs, stopping on the first failure.

## Verification

- Final local full `npm run ci`: exit0; **6,438 passes/299 explicit skips**,403 files passed/44 skipped; TypeScript, lint and finalized production build pass;0 lint errors/347 existing warnings.
- Exact e3eae02f GitHub CI [39573115094](https://github.com/mbayangxo/Kebu/actions/runs/39573115094): SUCCESS.
- Exact Builder SQL/browser [39573115053](https://github.com/mbayangxo/Kebu/actions/runs/39573115053), job119131932766: **74 passes,0 skips/unexpected/flaky**, unchanged nine performance probes retained; SUCCESS.
- Exact platform SQL/browser [39573115070](https://github.com/mbayangxo/Kebu/actions/runs/39573115070): SUCCESS.
- Exact native PostgreSQL17.6 [39573115159](https://github.com/mbayangxo/Kebu/actions/runs/39573115159), job119131932994: **10cases ×3 mandatory runs=30passes,0skips**, generated databases independently confirmed cleaned; SUCCESS.
- Exact hosted Preview smoke [39573310894](https://github.com/mbayangxo/Kebu/actions/runs/39573310894): SUCCESS. Public smoke does not establish the separate26 authenticated cases.

Earlier local broad72 and focused11 overlap by9; do not add them as83 unique cases. The final combined74 was actually run remotely. No local native PostgreSQL pass is claimed: native session verification ran in the GitHub service container.

## Still blocked / next work

**Authenticated hosted26 remain unexecuted.** Connected Supabase exposes production only. Existing dedicated QA ref `skqnxyaeimvbyrmdfzvk` returned an explicit permission error. Plugin controls cannot change project/OAuth access. The optional organization-selection question for a separate QA cost check was aborted without an answer; it is not approval. No project was restored/created, paid infrastructure bought or working production database paused. Production still has22/37 missing catalog/grant prerequisites from the read-only preflight; migration identity differences need isolated review before any production migration. No DNS, production schema or production promotion changed.

Continue Builder independent frame sizing/fit and remaining real workflows while QA setup is unavailable. Full Builder/Studio/May/3J/99-group requirements remain open. Preserve completed3C–3I and Claude Mail/font work. Provider credentials, payment proof/atomic completion/private paid delivery, actual May media/art direction and full Search/Rooms remain separate requirements.

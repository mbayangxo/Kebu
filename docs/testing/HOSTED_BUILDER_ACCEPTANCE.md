# Authenticated Builder acceptance

The public preview suite is a smoke check. Its 35 historically skipped cases are not authenticated acceptance. Use `node scripts/verify-hosted-builder-acceptance.mjs` for the separate Builder gate: **21 journey cases plus five measured viewport cases**, exactly 26 passes, zero skips, zero retries, zero flaky cases. Source must be committed/clean and match the deployment commit when supplied by CI. The command exits nonzero when configuration, fixture authorization, execution or the exact count is missing.

## Required private QA configuration

Configure these through the private environment/CI secret store; never paste credentials into chat, commit them, or upload authentication state/traces:

- `KEBU_E2E_BASE_URL`: the exact authorized non-production preview origin.
- `KEBU_HOSTED_QA_ORIGIN`: the separately approved exact preview origin, matching that URL. CI must not send a QA session to an arbitrary URL from a deployment event. Configure the same explicit origin as a repository variable for the credential-free source gate; update it deliberately for the next immutable preview.
- `KEBU_E2E_BUILDER_COOKIE`: the real Supabase Cookie header, including its `sb-<qa-ref>-auth-token` name and every contiguous `.0`, `.1`, … chunk when chunked. An opaque token or a cookie named `session` does not authenticate this application. Unrelated cookies are excluded.
- `KEBU_E2E_PROJECT_ID`: an explicitly provisioned disposable native `kcd-1` QA project owned by that session. Provide editable text, multiple sections/pages, an actual uploaded asset, responsive states and navigation needed by the cases; do not point tests at May's real project or a production user's work.
- `KEBU_E2E_DISPOSABLE_PROJECT=1`: explicit acknowledgement that this named staging fixture may be edited, reordered, have test sections/pages removed, and published within staging. The command does not create a paid project, provision users, alter schemas or clean arbitrary data.
- `VERCEL_AUTOMATION_BYPASS_SECRET`, only if the authorized preview needs deployment protection authentication. It does not replace a Kebu session.

Before navigating to mutation tests, the helper requests the actual authenticated project and requires a matching ID, `document_schema_version=kcd-1` and server `renderPath=kcd`. The preserved render guard refuses native mode in production and against the production Supabase reference. A failed preflight stops before mutations. Do not remove that guard to make a test pass. These are native Builder cases; they do not certify every legacy template.

Cases run serially against the named disposable fixture. Their declared capabilities still need actual staging execution and any selector/fixture/implementation discrepancies repaired there. Tightening an assertion or successfully collecting 26 cases is **not** a claim those cases passed. The current authenticated hosted gate remains blocked on isolated QA/session access.

## CI wiring

`.github/workflows/e2e-preview.yml` remains public smoke. The separate `.github/workflows/hosted-builder-acceptance.yml` runs on recovery-branch pushes so it works without prematurely merging a deployment-status workflow into the default `main` branch. Before enabling `KEBU_HOSTED_QA_ENABLED=1` as a repository variable, configure the `hosted-qa` environment with the required reviewer and environment-scoped QA secrets/variables above. The reviewer must approve the exact checked-out commit. The initial credential-free source job reads the authoritative GitHub ref, requires exact-source CI success and checks Vercel-bot Preview deployment/status records against the separately approved origin. It waits for CI/preview readiness, makes no application requests and receives no QA session. Vercel's deployment `ref` can itself be a SHA, so a branch-name comparison is insufficient. Other source heads and production deployments are rejected.

The protected job supplies the session only to the final test step, not dependency/browser installation. Its source is the exact deployment commit. `KEBU_HOSTED_SOURCE_SHA` binds the clean checkout to that source. No acceptance is established when the opt-in job is skipped, awaits review or lacks configuration.

The runner writes a credential-free `summary.json` containing source SHA, counts and acceptance status. CI uploads only that summary, never raw reports, headers, cookies, session storage or traces. Playwright tracing is disabled whenever session or protection credentials are supplied. A passed Builder summary is not a Mail/Studio/May/provider acceptance or a production promotion approval.

## Verified local boundaries

The actual local Next app previously demonstrated the false-green defect: `waitForBuilder()` resolved on `/login` after swallowing the missing-editor error. The repair rejects sign-in and template preview pages and requires the actual named Site canvas plus Save draft control. Real local Builder geometry covers 390/430/768/1024/1440px, opening/dismissing the real sidebar and measuring its bounds. Text helper save/reload and section insertion/keyboard undo/redo are checked against migrated isolated SQL. Those runs use fixture auth/transport and do not certify hosted Supabase JWT/RLS.

The strict runner's missing-configuration check was executed and returned `accepted:false`, exit1. Collection separately confirmed 26 cases; no browser mutation or authentication occurred in that collection check. Full hosted execution remains explicitly open.

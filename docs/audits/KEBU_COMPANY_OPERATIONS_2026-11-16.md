# Company operations source checkpoint — November 16, 2026

Base: `80aaed3499d8cd4f7bdd7e3328235ec801512fed`. This is a source candidate, not a production launch or whole-KEBU completion receipt.

## Changes

- Atomic verified-email invitation acceptance, row/advisory locks, current inviter permissions, retry protection, no resurrection of removed membership, immutable invite identity and transactional audit. Ordinary employees cannot invite privileged users or read other candidates' applications. Hiring notes remain manager-only.
- Separate optional Liguey marketplace installation under the existing account. Kebu Business remains the operating workspace. Independent QA gates keep both additions off production.
- Actual manual operator review records for employer registry, recruiter authority and optionally office address. Publication requires current approval. Reviews expire; candidate reports are private. Submitting a registration number or website is not automatic verification.
- Proposed interviews require applicant consent, current approved recruiting status, private online Rooms or an independently reviewed office snapshot. Conflicts with interviews and work shifts are rejected under participant locks. Acceptance creates real calendar events; cancellation closes the associated interview room/call.
- Accepted applicants receive a pending invitation, not automatic company access. After acceptance, company onboarding lessons/quizzes, project tasks, submissions through shared documents and feedback, company discussions, shifts, benefits and private HR/pay records connect to existing primitives. Payroll records are employer-entered; no transfers, tax engine or bank credentials.
- Multi-company summaries read only current active memberships. No presumed ownership hierarchy or access to unrelated ecosystem companies.
- Name research saves private shortlists, checks a limited subset of reviewed active KEBU employers and links to official registry searches. It does not determine trademark clearance or reserve business names.
- Four November 12 migrations repaired for repeatability, safe ownership validation, explicit function search paths and current room membership. No existing tenant row is silently repointed or deleted. Read-only preflight: `supabase/preflight/editor_cloud_four.sql`.
- Revoked company membership removes company room access/call participation and rotates document collaboration epochs. Active clients periodically revalidate access and disconnect on failed verification. Previously downloaded material cannot be remotely erased; this is not an instant media revocation certification.

## Evidence

Local PGlite runs execute the actual scoped migrations and authenticated SQL roles against reconstructed prerequisites, not hosted Supabase Auth/Realtime:

- Invitation SQL plus RPC/email boundary: 9 tests passed.
- Four migration/editor/cloud/realtime checks: 24 tests passed, including repeated application and removed-member denial.
- Combined SQL/migration suite: 25 passed; subsequent final company suite: 12 passed, including full hiring → accepted invitation → onboarding quiz → assigned/completed project → feedback → two distinct authorized companies, recruitment privacy and currency input hardening.
- Focused API/call/document checks: 38 passed.
- Final repository gates passed: migration hygiene (149 unique versions), TypeScript, lint (zero errors / 374 warnings), full Vitest suite (7,190 passed / 519 explicit environment skips) and optimized production build. The final suite used `--maxWorkers=4`; the initial unbounded run with every local PGlite environment test enabled was interrupted after stalling. Database suites were run separately with the explicit PGlite fixture setting rather than represented by their global-suite skips.
- Additional operator-review SQL acceptance: 4 passed, covering actual submission → service-only review → publication, rejection of missing independent checks, one audit event and stale-write protection. The new test was also linted separately after formatting. This brings focused company SQL/input acceptance to 13 cases; no new production behavior was added after the final build.

These SQL tests are sequential/retry and lock-behavior evidence, not a real parallel-connection load test. Native PostgreSQL contention acceptance remains required for invitation/revoke and interview/shift races.

## Hosted and release boundaries

Read-only QA connection now works: `skqnxyaeimvbyrmdfzvk` reports ACTIVE_HEALTHY on PostgreSQL 17.11. This corrects the earlier inaccessible-QA report. Its schema lacks `sheet_bodies`, `slide_bodies`, `workspace_items`, `cloud_deployments`, `cloud_deployment_versions`, `room_calls` and `room_call_participants`. It is unsafe to apply only the four repairs there. Reconcile and rehearse the prerequisite migration chain on a recoverable QA database before rollout. No hosted DDL, production data mutation, provider send, deployment or spending occurred.

New worker/interview migrations form an ordered batch: worker actions reference the later interview table at runtime. Keep feature flags off until the complete batch, base schema and permission acceptance have passed. Do not enable intermediate migration states. Existing history includes archived prerequisites; the fixture is not proof that the entire canonical chain can provision a new hosted project.

Browser acceptance is blocked in this environment: the Playwright Chromium download repeatedly produced truncated/corrupt archives. Earlier packaged Chromium rendered invalid zero-height text and system Chromium could not open required Unix sockets. No browser, camera, microphone, screen-share, accessibility/visual or real two-account acceptance is claimed. Do not bypass the environment or substitute a mocked screenshot as evidence.

State lists currently cap at 100 with a truncation notice; pagination, data export/retention policy, larger-company load, operational staffing and onboarding pilot acceptance remain open. This is not a complete HRIS or enterprise security certification.

Vercel remains deferred until reset. Earlier shared-project restoration approval is already resolved; do not repeat approval, payment or login requests. May's actual 13-page project is preserved. Approved biography/content and remaining motion acceptance are still open; do not substitute a fixture, invent her biography or tell her the public site is ready. Provider delivery/payment acceptance remains open.

## Official naming references checked November 16

- https://www.wipo.int/en/web/global-brand-database/faqs_branddb — participating coverage can lag; automated querying/bulk downloading is restricted.
- https://www.wipo.int/en/web/global-brand-database/index — official database recommends national/regional registry research too.
- https://oapi.int/proteger-la-pi/recherche-danteriorite/ — official prior-right search service.
- https://www.aripo.org/public/ip-services/trademarks — Banjul System covers contracting states, not all African countries.

Do not present a KEBU name match or absence of one as legal advice, registry approval or a continent-wide trademark result. Registry licensing/integration and real review operations are separate required work.

# Kebu Business, Liguey, JOKKO and release closure audit

November 16, 2026 — America/New_York. Inspected shared source `52ed00c21bc1acc381d44062b9c99c80b16fa963`. Scoped audit of company operations, payments and the named release blockers; NOT certification of every Kebu feature.

## Decision

Finish one dependable company workflow and one properly accounted payout rail before expanding payroll or adding more company features. Kebu owns workflow/approvals and truthful user-facing records; JOKKO remains a separate payment service. Keep Liguey optional and preserve the existing Kebu login. A hosting reset is necessary for this chosen release path but cannot repair missing database foundations, enable QA-only features or certify payments.

## Fresh observations

| Check | Verified result | Implication |
| --- | --- | --- |
| Shared branch | Base above includes the November 16 company implementation; clean source checkpoint was fetched and workspace continuity passed | Earlier source work is recoverable; this audit does not substitute an old local directory for it |
| QA `skqnxyaeimvbyrmdfzvk` | Read-only catalog inventory: 2 of 26 selected required tables exist (`business_members`, `business_invites`); 24 are missing. Migration ledger has 141 entries, including legacy bundle names | The blocker is schema/history drift, not just four unapplied migrations or a login problem |
| Missing QA foundations | Library, workspace items, Rooms/members/calls, Sheets/Slides bodies, Cloud, app installs, hiring and company operations | Cannot validate a real company workflow there until the dependency chain is reconciled |
| Vercel project `kebu` | `live:false`; verified custom domains include `www.maylecor.com` and `www.k-direction.com` | Do not reconnect working DNS as a speculative repair |
| May public HTTP | Fresh request returned HTTP 402, `DEPLOYMENT_DISABLED` | The public site is still not ready for a bio link |
| Latest deployment returned by project API | An old October 23 preview failed because it requested a 15-minute cron on Hobby; it is not the current candidate or necessarily the production deployment | Current source already has daily cron expressions. Do not upgrade or claim a new code fix on the strength of this historical error |
| Fresh browser launch | System Chromium fails before opening a page: Unix `socket()` operation not permitted | Browser acceptance still needs an environment that supports a real browser. No attempt to bypass workspace restrictions |
| Rollout gates | `companyPortalEnabled()` and `ligueyEnabled()` explicitly reject `VERCEL_ENV=production` | Even restored hosting will not make these additions live without a reviewed production rollout change |

JOKKO findings are limited to the Kebu-side partner bridge. No separate JOKKO service repository or current outbound contract was retrieved, so this report does not certify or deny capabilities of that separate service.

The inventory is checked in at `supabase/preflight/company_release_inventory.sql`; it is read-only and contains no account records or secrets. Presence/RLS/policy counts do not prove policy correctness. The first extraction attempt split a comment at a semicolon and returned a syntax error; the corrected catalog query succeeded with no database change.

## Findings and improvements

| Priority / ID | Evidence and failure | Action / closure proof |
| --- | --- | --- |
| P0 PAY01 — currency confusion | `processDeveloperPayout` passed `amount_cents` directly to an XOF transfer regardless of the stored currency. USD cents are not CFA francs | Source now rejects non-XOF dispatch without a persisted accepted conversion. Local negative test verifies rejection without status mutation. An immutable FX quote/accounting implementation is still required |
| P0 PAY02 — guessed provider contract | Old Wave path `/v1/business/disbursements` and body differ from official `/v1/payout`; Orange transfer shape was explicitly unverified. Keys alone enabled them | Removed guessed network dispatch; outbound Wave/Orange capabilities now remain disabled in source with no environment bypass. A test with fixture keys confirms no HTTP call. This is containment, NOT a finished disbursement integration |
| P0 PAY03 — falsely available funds | `getDeveloperEarningsSummary` counted an existing XOF claim as zero when conversion was unavailable (`?? 0`) | Reproduced with a failing test; repaired to return an unavailable balance instead. This stops a silent zero deduction, but does not replace immutable historical FX/reservation accounting |
| P0 PAY04 — non-atomic entitlement | `requestDeveloperPayout` separately reads balance then inserts. `developer_payouts` INSERT RLS checks owner/destination, not available earnings; direct authenticated inserts bypass the application balance check | Replace with one scoped transactional reservation RPC and revoke direct inserts. Prove two real concurrent claims cannot over-reserve. Existing SQL tests actually permit a request without earnings; that is evidence of a gap, not proof of economic safety |
| P0 PAY05 — uncertainty/reconciliation | Automatic path has no durable outbox/lease/status lookup reconciliation, ignores some local status-update errors and treats unsuccessful results as failed. Manual paid update lacks required receipt/CAS transition | Keep automatic hold. Add stable intent IDs, reservation journal, `unknown/reconciling`, authoritative status binding, terminal-state rules and audited manual evidence before any live payout. No provider transfer was attempted |
| P0 DB01 — unsafe blind migration replay | Archived text-version ledger plus missing timestamped foundations. `20261108020000_room_calls_mesh.sql` drops `room_calls cascade` while upgrading the earlier two-person schema | Build a target-specific additive repair/baseline and rehearse with existing-data fixtures. Preserve/map/archive prior call history instead of blindly running a destructive upgrade. Do not mark files applied just to silence drift |
| P0 REL01 — source/hosted/release mismatch | QA missing prerequisites; new product flags are QA-only; known public host still 402 | Use the ordered release gates below. Reset does not authorize enabling every module, replaying archives or promoting old source |
| P1 CALL01 — initial-call race | Latest `room_call_join(uuid,int)` locks an existing active call row; when none exists there is no room-level lock or active-call uniqueness constraint | Code-level race finding; not reproduced against native concurrent sessions here. Serialize on the parent room/advisory lock and enforce an appropriate one-active-call invariant after auditing existing duplicates. Test two independent first joins and last-leave/new-join races |
| P1 BIZ01 — records disappear past 100 | Workplace API limits multiple tables to 101 and returns 100 without stable ordering/cursor pagination | Add stable cursor pagination, filters for my work/date/status and indexed company/person keys. Verify 150 tasks, shifts and pay records are all reachable and counts reconcile |
| P1 BIZ02 — narrower work/privacy policies | Existing company-level visibility is not a per-project guest/contractor access model; attachment does not share original Sheets/Slides | Document capability matrix; add scoped project membership/end dates only where needed. Show access before attaching; test another company's file cannot leak through a link or report |
| P1 TRUST01 — review operations | Employer review is manual and expires. Review events record decision/checks/note/time but no named reviewer identity | Persist verified reviewer identity and independent evidence provenance. Define report triage/resolution, suspension/appeals, office recheck and audit access. A registration link or checked checkbox is not independent proof or a guarantee against harm |
| P1 UX01 — interrupted work/time | Forms retain input during some failures, but that is not reload-safe onboarding/project recovery. Interview UI uses browser-local time | Add safe navigation/draft recovery for appropriate records, with no insecure storage of private HR/pay information; explicit interview timezone/location confirmation; test low bandwidth, reconnect, refresh and two-user edits |
| P1 OPS01 — worker timeliness | Current Vercel platform-worker cron is daily; near-real-time payout reconciliation cannot rely on it | Design and prove an authenticated, monitored worker schedule/queue with retries, dead letters and alerts. Reuse suitable existing infrastructure within approved costs; do not silently activate a paid service |

PAY01/PAY02/PAY03 source containment is implemented in this checkpoint. PAY04/PAY05 and CALL01 are open engineering work. No new payout schema, JOKKO disbursement endpoint, payroll engine or native race result is claimed.

## Closing the hosted migrations safely

1. **Inventory and recovery:** select QA explicitly; capture schema, table/constraint/function/policy/grant definitions, migration ledger and existing-data counts. Back up database and independently preserve relevant Storage objects. Supabase's database backup does not contain Storage file bytes. Verify a recovery procedure, not merely that a backup button exists.
2. **Dependency map:** compare actual objects to source, not just ledger strings. Known roots include workspace `20260920081000`, Rooms `20260920085000` plus scope/visibility, Library `20261016120000`, job listings/applications `20261016190000`, builtin installs `20261106074222`, Sheets `20261107010000`, Slides `20261108010000`, mesh calls `20261108020000` with subsequent call patches, and Cloud `20261109010000`. These are dependency roots, NOT a complete approved batch. Resolve referenced businesses/users/helpers/storage/Realtime and all later constraints first.
3. **Prepare reviewed SQL:** create a target-specific additive convergence plan. Preserve existing data and incompatible objects; explicitly address the destructive old call upgrade. Separate schema from historic seed/template/data scripts. Never replay every archived `APPLY_*` bundle onto May's saved project.
4. **Rehearse:** apply the exact batch on a recoverable disposable database with existing-row fixtures; compare row IDs/counts and ownership before/after; verify rollback/restore, constraints, RLS and grants. Native PostgreSQL and actual Supabase Auth/Storage/Realtime are separate evidence layers.
5. **Apply to QA only after review:** foundations → four November 12 repairs → ordered company/employer/interview/name migrations. Worker actions reference the later interview table at runtime, so keep flags off until the complete batch has committed and passed checks. Re-run both checked-in preflights and advisors; verify no unauthorized data exposure and actual API access.
6. **Close criterion:** the required table/function/column/constraint inventory matches; the four repair checks and company workflows pass against managed QA with zero unexplained skips; before/after preservation and restore evidence is saved. Ledger matches the operations actually performed.

QA security advisors currently report nine RLS/no-policy informational findings, three mutable-search-path functions, public `pg_net` and four authenticated-callable security-definer functions. These require purpose/authorization review, not automatic policy creation or global revocation: service-only tables may intentionally have no client policy. Remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable.

## Closing browser, provider and concurrent acceptance

Use one immutable candidate SHA and the correct QA Supabase project. Reuse the existing hosted-acceptance workflow where appropriate; it currently covers Builder, not every new company journey. Extend it with real separate founder, worker/candidate, ordinary employee, finance and wrong-company sessions. Preserve installation state across reload and assert API, database and user-visible results agree.

| Suite | Required scenarios and evidence |
| --- | --- |
| Browser journey | Add/remove Liguey; reviewed job/apply/decision; consented online and reviewed-office interview/calendar; invite acceptance; onboarding quiz; project/task/Docs/Sheets/Slides feedback; HR/pay privacy; shifts/benefits; two-company reporting; keyboard and phone layouts; offline/reconnect and refresh |
| Access removal | Remove membership while Docs/Rooms are active; test server denial and actual private Realtime/media disconnect, stale invite/approval rejection, old browser tabs and downloaded-file boundary. Client polling alone is not hosted security acceptance |
| Native PostgreSQL | Real distinct backend PIDs and observed lock barriers: double accept; revoke vs accept; inviter demotion/removal; competing interview/shift booking; simultaneous initial call joins; concurrent payout reservation; retry after commit/crash. Repeated sequential PGlite calls do not close these cases |
| Providers | Verify actual configured merchant capabilities/endpoints; test status binding, signed webhook replay/tampering, amount/currency/recipient mismatch, timeout after acceptance and reconciliation. Mail needs a delivered message and real inbox/thread behavior; an internal send record is insufficient |
| Physical calls | Actual camera/microphone permission allow/deny, screen-share start/stop, rejoin and two-device media. Synthetic media/browser tests are useful but not the full hardware acceptance |

Existing native CI tests cover publishing/budgets and a Shop journey, not the new invite/interview/payout/first-call races. Extend those gates with explicit nonzero expected cases and zero-skip assertions; retain machine-readable results and cleanup evidence. The fresh Chromium attempt is blocked and no native PostgreSQL server was available/configured for this run. Execute these cases in a permitted runner with disposable local services, then managed QA. No secret/hosted URL should be substituted into destructive disposable-database tests.

## Closing May's content and animation acceptance

Preserve the actual artist project, its owner, all saved page/section IDs, authored media/order and publication snapshot. The last documented real project has 13 pages; this audit did not read or mutate its current production contents. Do not open an old reseeding editor or use the generic fixture as the artist project.

Prepare a content sheet for signoff: display names/accent, biography, music/video links, current releases, approved photos/credits, booking/contact destination, social links and mobile navigation. Mark unsupported claims and unfinished sections instead of inventing credentials/releases. Optional proposed short biography for review only: “May Lècor creates original music in English and shares a separate cultural repertoire as May Lècor Diallo. Explore her music, videos and latest projects.” This is unapproved draft copy and was not published.

The November 5 source report explicitly leaves incoming replacement copy, torn-paper biography reveal, notebook transitions and full scene choreography unfinished. This is implementation work as well as acceptance; it cannot be closed by approving a biography or merely taking a screenshot.

Use an authorized reachable preview of the actual saved composition and original reference. Compare opening hold, title departure/incoming copy, biography reveal, later scene transitions, pin release and reverse scroll at phone/desktop/ultrawide sizes. Inspect loading/resize, reduced-motion behavior, native-vs-legacy renderer and links/forms. Use matching geometry/timing checkpoints, not identical-image pixel comparison with different artist assets. Record actual measurements and tune against approved results; do not invent pass thresholds/results retrospectively.

Close only after content signoff and the remaining transitions are implemented and accepted on the real saved site. Put `https://www.maylecor.com` in the public bio once a logged-out visitor check returns the intended public page, with working mobile links/contact and no deployment/auth wall.

## Closing production hosting

Wait for the actual usage restriction to clear or obtain explicit spending approval if the user chooses a different route; this audit requests neither an upgrade nor a new host. The prior shared-project restoration authorization is resolved and is not being requested again.

After QA/source acceptance, create a reviewed current candidate deployment, check its build/runtime logs and environment targets without exposing secrets, test a permitted preview with real QA services, and retain a known rollback candidate. Test all attached domains/routes and isolated Cloud origins. Do not promote the October failed preview or assume main contains the reviewed candidate. Production code needs a deliberate staged capability gate for approved Business/Liguey users; the current QA-only checks cannot be solved by blindly changing a boolean.

Promote only the approved candidate when the restriction is genuinely gone. Verify logged-out HTTPS on both custom domains, direct internal paths, static assets, artist links/contact, authentication, database target, security headers/camera policy and monitoring. Confirm what actually became live. Close only with successful public and authenticated checks, a recorded deployed SHA, recovery evidence and no unexplained provider/worker errors.

## Product improvements to prioritize after blockers

1. **One worker home:** next onboarding step, upcoming shift/interview, assigned work and unresolved HR request, each linking to its actual record. Add reliable notification delivery/status and my-work filtering before more dashboard modules.
2. **One finance queue:** approved obligations, funding/reserves, review, pending/unknown/failed payments and receipts. Keep employee, contractor, seller and creator entitlements distinct. Implement the first JOKKO-connected slice described in `../product/KEBU-JOKKO-PAYOUTS.md`; do not relabel current pay statements as payroll.
3. **One operational trust queue:** named reviewers, verified employer/office evidence, candidate reports with triage/resolution and a visible audit history. Never use AI or a Kebu Score to auto-approve employers or rank/reject candidates by sensitive attributes.

Defer bulk multi-country payroll, tax filing, arbitrary developer runtime, a large company-group ownership hierarchy and more marketplace categories until the first-party work and settlement flows are dependable. Preserve affordable access, low-data/mobile work, local payment needs and user ownership/export. Cross-company reporting is a permissioned view, not permission to mix funds or identities.

## Evidence for this checkpoint

- Fresh read-only QA inventory, migration metadata and security advisors; Vercel project/domain/deployment metadata; real public HTTP 402; fresh native Chromium failure.
- Payout safety tests failed before the fixes; guarded currency/credential cases pass afterwards. Missing-FX test reproduced the incorrect successful balance before the repair.
- Focused company and existing payout SQL suites: 6 files / 15 cases passed on PGlite using source migrations. This does not prove native concurrent behavior or managed Supabase acceptance.
- `NODE_OPTIONS=--max-old-space-size=6144 npm run ci` passed: 149-version migration hygiene, TypeScript, lint (zero errors / 374 existing warnings), full suite (7,193 passed / 520 explicit environment skips), and optimized production build. Focused payout safety/balance tests: 7 passed. The separate 15-case SQL suite ran with the explicit PGlite fixture setting; native/hosted suites were not substituted or called passed.
- No hosted migrations, deployment, production content changes, provider sends or financial transfers were performed.

## Official references checked November 16, 2026

- Wave payout contract: https://docs.wave.com/payout — verify endpoint, amounts, idempotency, authoritative status and retry semantics.
- Supabase migration process: https://supabase.com/docs/guides/deployment/database-migrations — local/remote histories must reflect actual schema changes; do not use ledger repair to fabricate schema.
- Supabase backups: https://supabase.com/docs/guides/platform/backups — preserve Storage objects separately from database metadata.
- Vercel cron constraints: https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing — daily scheduling compatibility is separate from sufficient job timeliness.

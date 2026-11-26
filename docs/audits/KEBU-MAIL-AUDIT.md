# Kebu Mail — implementation audit (October 20, 2026)

This is the authoritative, standalone evidence record for Kebu Mail work on this branch. Not a release certificate; genuine hosted Supabase Auth/RLS and live-provider (Resend) acceptance are explicitly open throughout and are never claimed from local fixture tests.

Working branch: `work/kebu-mail-k0xx-oct20`, created from `work/kebu-completion-audit-oct13` at commit `4a7eb05` — the same verified checkpoint `work/kebu-liguey-k066-oct20` was built from, kept as a separate branch so Mail and Liguey review independently.

## Headline: the docs were wrong, not the code

`AGENTS.md`, `docs/IMPLEMENTATION_STATUS.md` (lines 84, 191-206) and `docs/product/KEBU-MAIL.md` all said Kebu Mail is **NOT STARTED**. That status was stale. A substantial, genuinely wired implementation already existed in the repository (migrations `20260920084000` through `20260921013000`, `lib/mail/**`, `app/api/mail/**`, `app/email/page.tsx`, `app/components/mail/business-mail-setup.tsx`), built across ~30 commits authored September 20-22, 2026 — before this session's checkpoint — and never reconciled back into the status docs. This audit treats the real code as ground truth, verifies it directly, and corrects the docs at the end (see "Status doc correction").

## What was already real (confirmed by direct code reading, not assumed)

- **Outbound sending**: `lib/mail/provider.ts`'s `sendInternetMail()` makes a real `fetch` to `https://api.resend.com/emails` with a real API key, returns a typed retryable/non-retryable failure or a real provider message id. Never fakes success. Driven by a real cron worker (`app/api/cron/mail-delivery/route.ts`) with claim/lock/retry/backoff, suppression checks, and provider-health circuit breaking.
- **Inbound receiving**: `app/api/mail/inbound/resend/route.ts` is a real Resend inbound-parse webhook, Svix-signature-verified via the `resend` SDK before trusting any payload. Downloads real attachments from Resend's `download_url` into Supabase Storage.
- **Delivery/bounce/complaint events**: `app/api/mail/events/resend/route.ts`, same signature verification, updates message status, suppression list, and sender-reputation state.
- **Kebu-to-Kebu internal delivery**: `app/api/mail/send/route.ts` resolves any recipient address that exists in `mailboxes` and delivers directly into their inbox in the same request — no provider round-trip, which is why it works with zero Resend credentials.
- **Business domain verification**: `lib/mail/provider-domains.ts` calls Resend's real Domains API (register/verify/get), and `app/api/mail/business/route.ts` + `app/components/mail/business-mail-setup.tsx` walk a business owner through connecting an already-verified site domain, registering it with Resend, and showing Resend's own real DNS records.
- **RBAC, attachments, threading**: real, server-enforced (`can_send_mailbox`/`can_manage_business_mail` SECURITY DEFINER checks, both in RLS and in the API layer), real Supabase Storage attachment upload/download/copy, real thread identity (normalized subject + canonical participant set).

Full findings are in the session record; the point of repeating only the headline here is that none of this needed to be built from scratch, and claiming otherwise would have duplicated working, already-correct code.

## What was missing, broken, or unverified — and what this branch did about each

### 1. Automatic forwarding — did not exist at all

Not "unverified": `grep -rn "forwarding\|forwarding_rule"` across the whole repository (SQL and TypeScript) found nothing Mail-related before this branch. No table, no column, no worker.

**Built**: `supabase/migrations/20261020000000_kebu_mail_forwarding.sql` — `mail_forwarding_rules` (one active forward address per mailbox, RLS via the existing `can_send_mailbox` helper) plus `forwarded_from_message_id`/`forward_depth` tracking columns on `mail_messages` (depth capped at 5, both at the schema level via a CHECK and in the engine, to make loops structurally impossible, not just discouraged).

`lib/mail/forwarding.ts` — `processMailForwarding()`, wired into both places a message ever lands in a mailbox's inbox: the internal-delivery loop in `send/route.ts` and the inbound webhook in `inbound/resend/route.ts`. Internal targets are delivered the same way normal internal mail is (and recurse, so short forward chains work); external targets reuse the **exact same** `mail_delivery_jobs` queue and cron worker every other outbound message goes through — no new sending code path, no bypass of suppression/readiness checks. A forwarding failure (e.g. the sending domain isn't ready) records an alert and never breaks the delivery that triggered it.

`app/api/mail/forwarding/route.ts` (GET/POST/PATCH/DELETE) is the real management API, with a minimal real UI panel added to `app/email/page.tsx` (a "Forwarding" toggle in the mailbox sidebar — set/pause/resume/remove).

**Verified for real**:
- `tests/mail/forwarding.local.test.ts` — 5 real-SQL PGlite cases against the actual migration (owner manage, stranger denied, business-manager manage / employee denied, one-rule-per-mailbox uniqueness, forward-depth CHECK bound). All passed.
- Real-browser harness (below) — an actual forward chain delivering to both inboxes, and an actual external-forward enqueue, both exercised through the real UI and real route code.

### 2. A real bug found while building the forwarding UI: a stale-fetch race could wipe a user's typed input

Same class of bug fixed earlier in this session's Liguey work. Opening the new "Forwarding" panel kicks off an async `loadForwarding()` fetch; if the user typed a forward-to address before that fetch resolved, the resolution would overwrite their typed text back to the server's (empty) value. Found by the real-browser harness, not assumed — reproduced, then fixed with a touched-input ref guard (`app/email/page.tsx`) so a load can never overwrite text the user has already started entering.

### 3. A real bug found while reading `lib/mail/delivery.ts`: `sending_enabled` was never set to `true` anywhere

`externalMailReadiness()` requires `sending_enabled = true` on the domain row before any external send is allowed. Grepped the entire app for every write to `sending_enabled`/`inbound_enabled`: **zero**. The business domain-verification flow (`app/api/mail/business/route.ts`) updated `status` to `'verified'` on a successful Resend verification but never flipped `sending_enabled`. This means **no business domain could ever actually send or receive mail, even once fully verified by the provider** — external sending was permanently gated shut by a flag nothing ever set. Not a cosmetic gap: this is the exact thing the governing instruction asked to verify ("real email sending and receiving... domain configuration").

**Fixed**: `app/api/mail/business/route.ts`'s `verify_domain` action now sets `sending_enabled`/`inbound_enabled` to match the real provider verification result. **Verified for real**: `tests/mail/business-mail-route.test.ts` (3 mocked-provider cases) — the regression check specifically asserts the Supabase update payload includes `sending_enabled: true` on a Resend-verified domain, `false` while still pending, and never flips it on a provider failure.

### 4. A real, more serious bug found by the real-browser harness: no RLS policy ever allowed creating a business mailbox

The only `INSERT` policy ever added to `public.mailboxes`, across every Mail migration (m1 through reputation guardrails), is m1's `"Users create own personal mailbox"`, which requires `mailbox_type = 'personal'`. No migration ever added an insert policy for `'business'` (or `'shared'`). `app/api/mail/business/route.ts`'s `create_mailbox` action inserts through the caller's own RLS-scoped client — meaning **every attempt to create a business address (`hello@verified-domain.com`) has always failed** with a bare row-level-security rejection, surfaced to the business owner only as a generic "Business mail setup failed." This was reproduced directly by the real-browser harness (a founder on an already-provider-verified domain, clicking "Create business email →", got a 500) before being root-caused and fixed — not inferred from reading the SQL alone.

**Fixed**: `supabase/migrations/20261020010000_kebu_business_mailbox_insert_repair.sql` — a second, additive permissive INSERT policy reusing the existing `can_manage_business_mail()` helper (same shape as the already-correct `mail_domains` insert policy from m3). Personal mailbox creation is untouched (Postgres ORs permissive policies for the same command).

**Verified for real**: `tests/mail/business-mailbox-insert.local.test.ts` — 5 real-SQL PGlite cases, including one that reproduces the exact pre-fix 42501 rejection before confirming the fix resolves it, one confirming a non-manager employee still correctly cannot, and one confirming the fix can't be abused to smuggle a mailbox through with a mismatched `owner_user_id`. All passed.

### 5. No real-browser verification existed for any of it

Only `tests/mail/mail-m1.test.ts` existed before this branch — a 2-case pure unit test of address normalization, no DB, no browser. Built `scripts/verify-mail-local-ui.mjs` + `tests/platform/mail.local.spec.ts` (7 Playwright cases), generalizing the same real-PGlite + loopback-PostgREST-fixture + real-Next-dev-server + real-Playwright/Chromium pattern already established for Work and Liguey this session. **Loopback Auth/REST fixture only — not hosted Supabase or a live Resend account, and never represented as either.**

Covers, all passing:
1. Two Kebu users creating personal mailboxes and emailing each other back and forth — send, cross-user inbox delivery, reload persistence, reply/threading.
2. Internal forwarding: a message to a mailbox with an active forward lands in **both** the original and the forward-target inbox (real chain, real `forwarded_from_message_id`/`forward_depth`).
3. External forwarding: forwarding to a non-Kebu address queues a real `mail_delivery_jobs` row through the real enqueue path, with no live provider needed to prove the enqueue logic is correct.
4. Retry after a simulated network failure: typed message text survives, and the retry succeeds.
5. RLS isolation: one user's own authenticated session cannot read another user's mailbox messages via the API (real Postgres RLS, not app-layer filtering).
6. A business mailbox created on an already-verified domain can send and receive exactly like any personal mailbox (this is the test that surfaced bug #4 above).
7. Mobile viewport layout check.

## What remains explicitly open (ops/credential-blocked, not code gaps)

Per the user's own choice this round ("local/code verification only for now"), the following were deliberately **not** attempted, and are not claimed as done:

- **Live Resend account**: no `RESEND_API_KEY`/`RESEND_WEBHOOK_SECRET` is configured in this environment. `sendInternetMail()`, the real inbound webhook, and the real event webhook are code-reviewed and unit-tested against a mocked provider (`tests/mail/provider.test.ts`, 9 cases — success, missing-key refusal, 5xx-retryable, 4xx-non-retryable, network-error-retryable, plus the Domains API register/verify/get calls), but never exercised against the real `api.resend.com`.
- **The platform `kebu.africa` domain's own verification**: unlike business domains, nothing ever drove `mail_platform_domains` through Resend's real verification — there was no admin route to do it. Built one: `app/api/admin/mail/platform-domain/route.ts` (admin-role-gated via the existing `resolveSupportAuthorization` helper, reusing `registerMailDomain`/`verifyMailDomain`). It will work once given a real `RESEND_API_KEY` and real DNS control over `kebu.africa` — neither of which this session has. Not yet covered by a dedicated mocked-route test (time-boxed out of this round; flagged, not silently skipped).
- **Hosted hosted delivery testing** (an actual email round-tripping to/from Gmail, Outlook, etc.): requires the above plus a deployed environment with the inbound/event webhook URLs actually registered with Resend and the two cron routes actually scheduled. Explicitly open.
- **Shared mailboxes and inbound aliases**: confirmed still schema-only (no mailbox is ever created with `mailbox_type = 'shared'`; `mail_inbound_routes` has no management UI/API). Not touched this round — out of the scope the user asked for (Kebu-to-Kebu mail + forwarding + verifying what exists).

## Status doc correction

`docs/product/KEBU-MAIL.md`'s header and `docs/IMPLEMENTATION_STATUS.md` lines 84/191-206 said "NOT STARTED." Corrected to reflect the real, verified state as of this audit (personal + business mail, real send/receive, forwarding, verified above) while explicitly keeping the live-provider/hosted-delivery and platform-domain-verification gates open. This is a narrow, factual status correction, not a rewrite of either document's structure.

## Full validation gate

`tsc --noEmit` 0 errors; `eslint` 0 errors / 4 warnings (all pre-existing, none touching files changed this round); `vitest run` without `KEBU_LOCAL_PGLITE_ROOT`: 6044 passed / 261 skipped (same 3 pre-existing hosted-QA-only failures, unrelated to Mail); with `KEBU_LOCAL_PGLITE_ROOT` set: 6188 passed / 117 skipped, all real-SQL files including the two new business-mailbox/forwarding regression files passing; `npm run build` exit 0.

## Changed/added paths

- `supabase/migrations/20261020000000_kebu_mail_forwarding.sql` (new)
- `supabase/migrations/20261020010000_kebu_business_mailbox_insert_repair.sql` (new)
- `lib/mail/forwarding.ts` (new)
- `app/api/mail/forwarding/route.ts` (new)
- `app/api/admin/mail/platform-domain/route.ts` (new)
- `app/api/mail/send/route.ts` (modified — forwarding hook)
- `app/api/mail/inbound/resend/route.ts` (modified — forwarding hook)
- `app/api/mail/business/route.ts` (modified — `sending_enabled`/`inbound_enabled` fix)
- `app/email/page.tsx` (modified — forwarding UI + race-guard)
- `scripts/verify-mail-local-ui.mjs` (new)
- `tests/platform/mail.local.spec.ts` (new)
- `tests/mail/forwarding.local.test.ts`, `tests/mail/business-mailbox-insert.local.test.ts`, `tests/mail/provider.test.ts`, `tests/mail/forwarding-route.test.ts`, `tests/mail/business-mail-route.test.ts` (new)
- `docs/product/KEBU-MAIL.md`, `docs/IMPLEMENTATION_STATUS.md` (status correction only)

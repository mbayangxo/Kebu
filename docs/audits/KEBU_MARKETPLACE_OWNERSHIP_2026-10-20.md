# Marketplace ownership authorization repair

October 20, 2026, America/New_York. Runtime `048622eb7f8fa023a5f35cdc61dbdadd478bc654`, tree `22e251873b7344c2d2793ecd58a70a8e57eaadab`, parent authoritative 0910bdac. A verified ownership-boundary repair, not complete paid-checkout acceptance.

## Reproduced failure

The paid checkout chain protected UPDATE-to-owned but left both INSERT policies checking only `owner_id = auth.uid()`. Two adversarial tests against the actual canonical migration SQL as an authenticated buyer expected paid ownership inserts to fail. Both instead returned a new owned row, with no payment. These were isolated PGlite tests, never production writes. Earlier happy-path CI passing did not establish this authorization property.

## Root repair

Authenticated acquisition routes retain the buyer identity and read/pricing checks from their user-scoped client, then use trusted server write authority for paid/catalog receipts. If that authority is unavailable they fail closed. Buyer-direct inserts are limited to truly free published Creative Assets and private uploaded aesthetics. Catalog/marketplace receipts and pending payment references cannot be fabricated through the owner REST role. Library receipts are immutable to the buyer: owner UPDATE policies are removed and UPDATE privilege revoked; editing a purchased aesthetic continues through the separate project theme flow. SELECT and allowed DELETE policies are retained.

The CLI-generated migration adds unique non-null reference indexes. Existing duplicate references cause an explicit migration failure requiring review, not silent data deletion or arbitrary ownership assignment. No existing authored rows are rewritten. Creative Asset references use cryptographic UUIDs. Invalid asset IDs, JSON and method values are rejected before privileged acquisition work. Service clients stay in server routes; buyer IDs come from authenticated users rather than request-owned IDs.

## Verification performed

- Exact local full `npm run ci` exited 0: 6,357 passed / 298 explicit skips; 397 files passed / 43 skipped; TypeScript/lint/finalized production build passed; zero lint errors / 349 existing warnings. This default test run explicitly skips local SQL suites without the opt-in runtime.
- Separately executed actual isolated SQL and route suite: **22/22 across three files**, including five actual SQL cases with the new migration applied. Paid owned/pending INSERTs, paid catalog receipts and buyer reference/amount/provider/status/binding edits are rejected. Trusted pending and owned records, owner-only reads, genuine free asset acquisition and private uploads remain usable. No provider call was real.
- Route cases cover secure-authority failure, legitimate trusted paid initiation using an explicit provider fixture, and invalid JSON/method/ID rejection before privileged work.
- Migration hygiene passed at 94 unique canonical timestamps. `20261021030002_marketplace_paid_ownership_boundary.sql` is local/test-only and has not been applied to production.
- The permanent platform gate now executes twenty SQL suites, including `tests/studio/marketplace-payment-boundary.local.test.ts`, and rejects skipped/empty SQL runs. Exact remote CI/platform/hosted results for 048622e are pending at this audit's creation.

Evidence summary: `evidence/marketplace-ownership-oct20/verification.json`. This repair was reviewed against Supabase's RLS guidance: owner predicates, role-limited policies, no user metadata authorization, no new definer functions or privilege bypass to fix owner access, and server-only service authority after authentication.

## Remaining checkout release blockers

Completion routines still need provider-confirmed amount, currency and payment-identity checks, atomic idempotent status/count updates and retry handling. Adapter currency semantics need reconciliation: the inspected card adapter treats input.amountMinor as XOF even for USD catalog checkout. Paid asset/template source exposure needs separate enforcement. Hosted Auth, actual database release and provider verification remain open. Service-role SQL compatibility is not evidence that a real signed webhook or real payment succeeded.

The separate social-rail checkpoint has its own verified Builder63/63 and full local CI evidence; this ownership branch does not yet include that slice. Reconcile both histories and rerun combined gates before authoritative integration. Full May fourteen-page/reference certification, Studio COS, independent image frames and remaining 3J/99 acceptance remain open. No production migration, DNS, promotion, email, payout or real payment was performed.
